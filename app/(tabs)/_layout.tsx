import { useCallback, useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { fetchNotificationsUnreadCount } from "../../src/lib/api";
import { on } from "../../src/lib/events/appEvents";

export default function TabsLayout() {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const loadUnreadCount = useCallback(async () => {
    const response = await fetchNotificationsUnreadCount();
    if (!response.ok || !response.data) return;
    setUnreadCount(response.data.count || 0);
  }, []);

  useEffect(() => {
    loadUnreadCount();

    const timer = setInterval(() => {
      loadUnreadCount();
    }, 45000);

    const unsubscribe = on("app:notifications-updated", () => {
      loadUnreadCount();
    });

    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [loadUnreadCount]);

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
    </Tabs>
  );
}
