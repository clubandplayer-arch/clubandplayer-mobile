import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BrandLogo } from "../../components/brand/BrandLogo";
import { fetchProfileMe, patchProfileMe } from "../../src/lib/api";
import { theme } from "../../src/theme";

type AccountType = "athlete" | "club";

function getTargetRoute(accountType: string | null | undefined): "/player/profile" | "/club/profile" | "/(tabs)/feed" {
  if (accountType === "club") return "/club/profile";
  if (accountType === "athlete") return "/player/profile";
  return "/(tabs)/feed";
}

export default function ChooseRoleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<AccountType | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      const response = await fetchProfileMe();

      if (cancelled) return;

      if (!response.ok) {
        Alert.alert("Errore", response.errorText ?? "Impossibile leggere il profilo");
        setLoading(false);
        return;
      }

      const accountType = typeof response.data?.account_type === "string" ? response.data.account_type : null;

      if (accountType === "club" || accountType === "athlete") {
        router.replace(getTargetRoute(accountType));
        return;
      }

      setLoading(false);
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const selectRole = async (accountType: AccountType) => {
    try {
      setSavingRole(accountType);

      const response = await patchProfileMe({ account_type: accountType });

      if (!response.ok) {
        Alert.alert("Errore", response.errorText ?? "Impossibile salvare il ruolo");
        return;
      }

      router.replace(getTargetRoute(accountType));
    } catch {
      Alert.alert("Errore", "Qualcosa è andato storto");
    } finally {
      setSavingRole(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

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

      <Text style={{ fontSize: 28, color: theme.colors.primary, fontFamily: theme.fonts.brand }}>
        Scegli il tuo ruolo
      </Text>

      <Text style={{ fontSize: 16, color: theme.colors.muted, lineHeight: 22 }}>
        Seleziona come vuoi usare Club & Player. Potrai completare il resto del profilo nel passaggio successivo.
      </Text>

      <View style={{ height: 12 }} />

      <Pressable
        onPress={() => selectRole("athlete")}
        disabled={savingRole !== null}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          opacity: savingRole !== null ? 0.8 : 1,
          backgroundColor: savingRole === "athlete" ? theme.colors.neutral100 : theme.colors.background,
        }}
      >
        {savingRole === "athlete" ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <Text style={{ fontWeight: "800", color: theme.colors.text }}>Player</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => selectRole("club")}
        disabled={savingRole !== null}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          opacity: savingRole !== null ? 0.8 : 1,
          backgroundColor: savingRole === "club" ? theme.colors.neutral100 : theme.colors.background,
        }}
      >
        {savingRole === "club" ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <Text style={{ fontWeight: "800", color: theme.colors.text }}>Club</Text>
        )}
      </Pressable>
    </View>
  );
}
