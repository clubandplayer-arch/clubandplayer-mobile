import { useCallback, useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { fetchDirectMessagesUnreadCount } from "../../src/lib/api";
import { useIsClub } from "../../src/lib/useIsClub";
import { on } from "../../src/lib/events/appEvents";
import { useNotificationsBadgeCount } from "../../src/lib/notificationsBadge";

export default function TabsLayout() {
  const unreadCount = useNotificationsBadgeCount();
  const { isClub, loading: isClubLoading } = useIsClub();
  const [messagesUnreadCount, setMessagesUnreadCount] = useState<number>(0);

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

  return (
    <View style={{ flex: 1 }}>
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
        {isClubLoading ? null : isClub ? (
          <Tabs.Screen
            name="club/roster"
            options={{
              title: "Rosa",
              tabBarLabel: "Rosa",
            }}
          />
        ) : null}
        <Tabs.Screen
          name="opportunities/index"
          options={{
            title: "Opportunità",
            tabBarLabel: "Opportunità",
            tabBarLabelStyle: { fontSize: 10 },
          }}
        />

        {/* Manteniamo la route create ma NON la mostriamo e NON la usiamo finché non è rifatta bene */}
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
    </View>
  );
}
