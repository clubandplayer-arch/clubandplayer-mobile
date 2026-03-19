import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { fetchProfileMe, fetchWhoami, type ProfileMe, type WhoamiResponse } from "../../src/lib/api";
import { getAccountTypeFromSources, setDashboardOnboardingSeen } from "../../src/lib/authFlow";
import { theme } from "../../src/theme";

export default function DashboardOnboardingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState(false);
  const [whoami, setWhoami] = useState<WhoamiResponse | null>(null);
  const [profile, setProfile] = useState<ProfileMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const [whoamiResponse, profileResponse] = await Promise.all([fetchWhoami(), fetchProfileMe()]);
      if (cancelled) return;
      if (!whoamiResponse.ok || !profileResponse.ok) {
        setError(whoamiResponse.errorText ?? profileResponse.errorText ?? "Errore caricamento onboarding");
      } else {
        setWhoami(whoamiResponse.data ?? null);
        setProfile(profileResponse.data ?? null);
      }
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const accountType = useMemo(() => getAccountTypeFromSources(whoami, profile), [profile, whoami]);
  const displayName = useMemo(() => {
    const value = profile?.display_name ?? profile?.full_name ?? "";
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }, [profile]);

  const handleContinue = async () => {
    const userId = typeof (whoami?.user as any)?.id === "string" ? (whoami?.user as any).id : null;
    try {
      setDismissing(true);
      await setDashboardOnboardingSeen(userId, true);
      router.replace(accountType === "club" ? "/club/profile" : "/(tabs)/feed");
    } catch (err: any) {
      Alert.alert("Errore", err?.message ?? "Impossibile completare l'onboarding");
    } finally {
      setDismissing(false);
    }
  };

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator /></View>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 48 }} style={{ backgroundColor: theme.colors.background }}>
      <Text style={{ fontSize: 28, color: theme.colors.primary, fontFamily: theme.fonts.brand }}>Benvenut{accountType === "club" ? "o" : "a"} su Club & Player</Text>
      <Text style={{ color: theme.colors.muted, lineHeight: 22 }}>{displayName ? `Ciao ${displayName}, ` : ""}questo blocco onboarding replica il gating web dopo il bootstrap sessione: ruolo, profilo e redirect vengono verificati prima di entrare nell'app.</Text>
      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
      <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 16, padding: 16, gap: 10 }}>
        <Text style={{ fontWeight: "800", color: theme.colors.text }}>Ruolo rilevato</Text>
        <Text style={{ color: theme.colors.muted }}>{accountType === "club" ? "Club" : accountType === "athlete" ? "Athlete" : "Da definire"}</Text>
      </View>
      <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 16, padding: 16, gap: 10 }}>
        <Text style={{ fontWeight: "800", color: theme.colors.text }}>Prossimo step</Text>
        <Text style={{ color: theme.colors.muted }}>{accountType === "club" ? "Completa o rivedi il profilo club prima di proseguire." : "Vai al feed; se il profilo atleta è incompleto il guard ti reindirizza alla compilazione."}</Text>
      </View>
      <Pressable onPress={() => void handleContinue()} disabled={dismissing} style={{ backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", opacity: dismissing ? 0.75 : 1 }}>
        {dismissing ? <ActivityIndicator color={theme.colors.background} /> : <Text style={{ color: theme.colors.background, fontWeight: "800" }}>Continua</Text>}
      </Pressable>
    </ScrollView>
  );
}
