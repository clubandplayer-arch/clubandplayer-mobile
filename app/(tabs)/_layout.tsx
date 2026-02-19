import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View, ActivityIndicator } from "react-native";

import { fetchDirectMessagesUnreadCount, fetchWhoami } from "../../src/lib/api";
import { on } from "../../src/lib/events/appEvents";
import { useNotificationsBadgeCount } from "../../src/lib/notificationsBadge";
import { theme } from "../../src/theme";

type StableRole = "club" | "athlete";
type AppRole = StableRole | "guest" | null | undefined;

export default function TabsLayout() {
  const router = useRouter();
  const unreadCount = useNotificationsBadgeCount();
  const [messagesUnreadCount, setMessagesUnreadCount] = useState<number>(0);

  const [role, setRole] = useState<AppRole>(undefined);
  const resolvedRef = useRef(false);

  const isClub = role === "club";
  const isStableRole: boolean = role === "club" || role === "athlete";

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

  useEffect(() => {
    let cancelled = false;

    const loadRoleOnce = async () => {
      const response = await fetchWhoami();
      if (cancelled) return;

      const nextRole = response.ok ? ((response.data?.role as AppRole) ?? null) : null;

      // Debug temporaneo: utile finché chiudiamo B2
      console.log("[tabs] whoami.role =", nextRole);

      setRole(nextRole);

      if (nextRole === "club" || nextRole === "athlete") {
        resolvedRef.current = true;
      }
    };

    // Prima lettura subito
    void loadRoleOnce();

    // Poll breve finché non arriva club/athlete (max 20s)
    let tries = 0;
    const poll = setInterval(() => {
      if (cancelled) return;
      if (resolvedRef.current) {
        clearInterval(poll);
        return;
      }

      tries += 1;
      void loadRoleOnce();

      if (tries >= 20) {
        clearInterval(poll);
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  const rosterOptions = useMemo(() => {
    // Screen sempre presente (no change-shape).
    // Non-club: tab nascosta.
    if (!isClub) {
      return {
        title: "Rosa",
        tabBarLabel: "Rosa",
        href: null,
      };
    }

    return {
      title: "Rosa",
      tabBarLabel: "Rosa",
    };
  }, [isClub]);

  // ✅ KEY FIX: non montare Tabs finché non hai un ruolo stabile
  if (!isStableRole) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, size, color }) => {
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
            case "roster/index":
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
      })}
    >
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
        name="opportunities/index"
        options={{
          title: "Opportunità",
          tabBarLabel: "Opportunità",
          headerShown: true,
          headerRight: () => (
            <Pressable onPress={() => router.push("/applications")} hitSlop={8}>
              <Text style={{ color: theme.colors.primary, fontWeight: "700", marginRight: 12 }}>
                Candidature
              </Text>
            </Pressable>
          ),
        }}
      />

      <Tabs.Screen name="roster/index" options={rosterOptions} />

      <Tabs.Screen name="create/index" options={{ title: "Crea", tabBarLabel: "Crea", href: null }} />

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
