import { useCallback, useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { fetchDirectMessagesUnreadCount } from "../../src/lib/api";
import { on } from "../../src/lib/events/appEvents";
import { useNotificationsBadgeCount } from "../../src/lib/notificationsBadge";
import { supabase } from "../../src/lib/supabase";
import { useIsClub } from "../../src/lib/useIsClub";

export default function TabsLayout() {
  const unreadCount = useNotificationsBadgeCount();
  const [sessionPresent, setSessionPresent] = useState(false);
  const { isClub } = useIsClub(sessionPresent);
  const [messagesUnreadCount, setMessagesUnreadCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const nextPresent = Boolean(data.session);
      setSessionPresent(nextPresent);
      if (__DEV__ && !nextPresent) {
        console.log("[tabs][useIsClub] skipped: sessionPresent=false");
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextPresent = Boolean(session);
      setSessionPresent(nextPresent);
      if (__DEV__ && !nextPresent) {
        console.log("[tabs][useIsClub] skipped: sessionPresent=false");
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const loadMessagesUnreadCount = useCallback(async () => {
    const response = await fetchDirectMessagesUnreadCount();
    if (!response.ok || !response.data) return;
    setMessagesUnreadCount(response.data.unreadThreads || 0);
  }, []);

  useEffect(() => {
    loadMessagesUnreadCount();

    const timer = setInterval(() => {
      loadMessagesUnreadCount();
    }, 45000);

    const unsubscribeMessages = on("app:direct-messages-updated", () => {
      loadMessagesUnreadCount();
    });

    return () => {
      clearInterval(timer);
      unsubscribeMessages();
    };
  }, [loadMessagesUnreadCount]);

  const commonOptions = ({ route }: { route: { name: string } }) => ({
    headerShown: false,
    tabBarHideOnKeyboard: true,

    tabBarIcon: ({ focused, size, color }: { focused: boolean; size: number; color: string }) => {
      let iconName: keyof typeof Ionicons.glyphMap = "apps";

      switch (route.name) {
        case "feed/index":
          iconName = focused ? "home" : "home-outline";
          break;
        case "search/index":
          iconName = focused ? "search" : "search-outline";
          break;
        case "messages/index":
          iconName = focused ? "chatbubble" : "chatbubble-outline";
          break;
        case "opportunities/index":
          iconName = focused ? "briefcase" : "briefcase-outline";
          break;
        case "club/roster":
          iconName = focused ? "people" : "people-outline";
          break;
        case "notifications/index":
          iconName = focused ? "notifications" : "notifications-outline";
          break;
        case "me/index":
          iconName = focused ? "person" : "person-outline";
          break;
      }

      return <Ionicons name={iconName} size={size ?? 22} color={color} />;
    },
  });

  return (
    <Tabs screenOptions={commonOptions}>
      <Tabs.Screen name="feed/index" options={{ title: "Feed", tabBarLabel: "Feed" }} />
      <Tabs.Screen name="search/index" options={{ title: "Cerca", tabBarLabel: "Cerca" }} />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: "Messaggi",
          tabBarLabel: "Messaggi",
          tabBarBadge: messagesUnreadCount > 0 ? messagesUnreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="club/roster"
        options={{
          title: "Rosa",
          tabBarLabel: "Rosa",
          href: isClub ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="opportunities/index"
        options={{
          title: "Opportunità",
          tabBarLabel: "Opportunità",
          tabBarLabelStyle: { fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="create/index"
        options={{ title: "Crea", tabBarLabel: "Crea", href: null }}
      />
      <Tabs.Screen
        name="notifications/index"
        options={{
          title: "Notifiche",
          tabBarLabel: "Notifiche",
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen name="me/index" options={{ title: "Profilo", tabBarLabel: "Profilo" }} />
      <Tabs.Screen name="messages/[profileId]" options={{ href: null }} />
      <Tabs.Screen name="me/debug" options={{ href: null }} />
    </Tabs>
  );
}
