import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";

export default function AuthCallback() {
  useEffect(() => {
    router.replace("/(tabs)/feed/index");
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
