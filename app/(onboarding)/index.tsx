import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

export default function OnboardingScreen() {
  const router = useRouter();

  const onContinue = useCallback(() => {
    router.replace("/(tabs)/feed");
  }, [router]);

  const onProfile = useCallback(() => {
    router.replace("/(tabs)/me");
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 16,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "800" }}>Onboarding</Text>
      <Text style={{ textAlign: "center" }}>Completa il profilo per continuare.</Text>
      <Pressable
        onPress={onContinue}
        style={{
          backgroundColor: "#0A66C2",
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#ffffff", fontWeight: "700" }}>Continua</Text>
      </Pressable>
      <Pressable
        onPress={onProfile}
        style={{
          borderWidth: 1,
          borderColor: "#111827",
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#111827", fontWeight: "700" }}>
          Vai al Profilo
        </Text>
      </Pressable>
    </View>
  );
}
