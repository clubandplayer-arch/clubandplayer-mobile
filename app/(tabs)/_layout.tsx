import { useCallback, useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

import {
  fetchDirectMessagesUnreadCount,
  fetchNotificationsUnreadCount,
} from "../../src/lib/api";
import { on } from "../../src/lib/events/appEvents";

export default function TabsLayout() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [messagesUnreadCount, setMessagesUnreadCount] = useState<number>(0);

  const loadUnreadCount = useCallback(async () => {
    const response = await fetchNotificationsUnreadCount();
    if (!response.ok || !response.data) return;
    setUnreadCount(response.data.count || 0);
  }, []);

  const loadMessagesUnreadCount = useCallback(async () => {
    const response = await fetchDirectMessagesUnreadCount();
    if (!response.ok || !response.data) return;
    setMessagesUnreadCount(response.data.unreadThreads || 0);
  }, []);

  useEffect(() => {
    loadUnreadCount();
    loadMessagesUnreadCount();

    const timer = setInterval(() => {
      loadUnreadCount();
      loadMessagesUnreadCount();
    }, 45000);

    const unsubscribeNotifications = on("app:notifications-updated", () => {
      loadUnreadCount();
    });

    const unsubscribeMessages = on("app:direct-messages-updated", () => {
      loadMessagesUnreadCount();
    });

    return () => {
      clearInterval(timer);
      unsubscribeNotifications();
      unsubscribeMessages();
    };
  }, [loadMessagesUnreadCount, loadUnreadCount]);

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
            case "create/index":
              iconName = focused ? "add-circle" : "add-circle-outline";
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
      <Tabs.Screen
        name="feed/index"
        options={{ title: "Feed", tabBarLabel: "Feed" }}
      />
      <Tabs.Screen
        name="search/index"
        options={{ title: "Cerca", tabBarLabel: "Cerca" }}
      />
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
            <Pressable onPress={() => router.push("/my/applications")} hitSlop={8}>
              <Text style={{ color: "#1d4ed8", fontWeight: "700" }}>Candidature</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="create/index"
        options={{ title: "Crea", tabBarLabel: "Crea" }}
      />
      <Tabs.Screen
        name="notifications/index"
        options={{
          title: "Notifiche",
          tabBarLabel: "Notifiche",
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="me/index"
        options={{ title: "Profilo", tabBarLabel: "Profilo" }}
      />
      <Tabs.Screen
        name="messages/[profileId]"
        options={{ href: null }}
      />
    </Tabs>
  );
}
