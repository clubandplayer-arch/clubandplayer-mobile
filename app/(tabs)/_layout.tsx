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
            case "feed":
              iconName = focused ? "home" : "home-outline";
              break;
            case "search":
              iconName = focused ? "search" : "search-outline";
              break;
            case "create":
              iconName = focused ? "add-circle" : "add-circle-outline";
              break;
            case "notifications":
              iconName = focused ? "notifications" : "notifications-outline";
              break;
            case "me":
              iconName = focused ? "person" : "person-outline";
              break;
          }

          return <Ionicons name={iconName} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="feed" options={{ title: "Feed", tabBarLabel: "Feed" }} />
      <Tabs.Screen
        name="search"
        options={{ title: "Cerca", tabBarLabel: "Cerca" }}
      />
      <Tabs.Screen name="create" options={{ title: "Crea", tabBarLabel: "Crea" }} />
      <Tabs.Screen
        name="notifications"
        options={{ title: "Notifiche", tabBarLabel: "Notifiche" }}
      />
      <Tabs.Screen name="me" options={{ title: "Profilo", tabBarLabel: "Profilo" }} />
    </Tabs>
  );
}
