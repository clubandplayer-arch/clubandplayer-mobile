import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { BrandLogo } from "../../components/brand/BrandLogo";
import { setOnboardingSeen } from "../../src/lib/onboarding";
import { theme } from "../../src/theme";

export default function OnboardingScreen() {
  const [loading, setLoading] = useState(false);

  const goTo = async (path: "/(auth)/login" | "/(auth)/signup") => {
    try {
      setLoading(true);
      await setOnboardingSeen(true);
      router.replace(path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        justifyContent: "center",
        gap: 14,
        backgroundColor: theme.colors.background,
      }}
    >
      <BrandLogo />

      <Text style={{ fontSize: 30, color: theme.colors.primary, fontFamily: theme.fonts.brand }}>
        Benvenuto su Club & Player
      </Text>

      <Text style={{ fontSize: 16, color: theme.colors.muted, lineHeight: 22 }}>
        Il social sportivo per <Text style={{ fontWeight: "800" }}>Club</Text> e{" "}
        <Text style={{ fontWeight: "800" }}>Giocatori</Text>. Segui, pubblica, candidati e
        resta aggiornato.
      </Text>

      <View style={{ height: 12 }} />

      <Pressable
        onPress={() => goTo("/(auth)/login")}
        disabled={loading}
        style={{
          backgroundColor: theme.colors.primary,
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          opacity: loading ? 0.8 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.background} />
        ) : (
          <Text style={{ color: theme.colors.background, fontWeight: "800" }}>Accedi</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => goTo("/(auth)/signup")}
        disabled={loading}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          opacity: loading ? 0.8 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.muted} />
        ) : (
          <Text style={{ fontWeight: "800" }}>Registrati</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => goTo("/(auth)/login")}
        disabled={loading}
        style={{
          paddingVertical: 10,
          alignItems: "center",
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ color: theme.colors.muted }}>Continua più tardi</Text>
      </Pressable>

      <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 8 }}>
        Nota: la navigazione “ospite” verrà aggiunta più avanti. Per ora è richiesto l’accesso.
      </Text>
    </View>
  );
}
