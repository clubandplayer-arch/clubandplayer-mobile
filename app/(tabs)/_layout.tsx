import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
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
            case "player/profile/index":
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
        options={{ title: "Notifiche", tabBarLabel: "Notifiche" }}
      />
      <Tabs.Screen
        name="player/profile/index"
        options={{ title: "Profilo", tabBarLabel: "Profilo" }}
      />
    </Tabs>
  );
}
