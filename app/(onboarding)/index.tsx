import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { setOnboardingSeen } from "../../src/lib/onboarding";

export default function OnboardingScreen() {
  const [loading, setLoading] = useState(false);

  const completeOnboarding = async () => {
    try {
      setLoading(true);
      await setOnboardingSeen(true);
      router.replace("/(auth)/signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "700" }}>
        Benvenuto su Club & Player
      </Text>
      <Text style={{ fontSize: 16, color: "#444" }}>
        Scopri eventi, community e contenuti sportivi pensati per te.
      </Text>

      <Pressable
        onPress={completeOnboarding}
        disabled={loading}
        style={{
          borderWidth: 1,
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          opacity: loading ? 0.8 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text style={{ fontWeight: "700" }}>Salta</Text>
        )}
      </Pressable>

      <Pressable
        onPress={completeOnboarding}
        disabled={loading}
        style={{
          backgroundColor: "#0A66C2",
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          opacity: loading ? 0.8 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: "white", fontWeight: "700" }}>Inizia</Text>
        )}
      </Pressable>
    </View>
  );
}
