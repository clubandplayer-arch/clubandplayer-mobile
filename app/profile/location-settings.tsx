import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";

import { fetchProfileMe, useWebSession, type ProfileMe } from "../../src/lib/api";
import { normalizeAccountType } from "../../src/lib/nav/profileLinks";
import { theme } from "../../src/theme";

export default function LocationSettingsInfoScreen() {
  const router = useRouter();
  const web = useWebSession();
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<"club" | "player" | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!web.ready) return;
      setLoading(true);
      const response = await fetchProfileMe();
      if (!cancelled && response.ok && response.data) {
        const profile = response.data as ProfileMe;
        setAccountType(normalizeAccountType(profile.account_type));
      }
      if (!cancelled) {
        setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [web.ready]);

  const profileHref = useMemo(() => {
    if (accountType === "club") return "/club/profile" as const;
    return "/player/profile" as const;
  }, [accountType]);

  const profileLabel = useMemo(() => {
    if (accountType === "club") return "Apri profilo Club";
    return "Apri profilo Player";
  }, [accountType]);

  if (web.loading || loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 14 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
      >
        <Text style={{ fontWeight: "600" }}>Indietro</Text>
      </Pressable>

      <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Località</Text>
        <Text>
          Su mobile questa non è una schermata di editing separata: la zona di interesse si aggiorna da Impostazioni e i dati profilo restano nei percorsi profilo dedicati.
        </Text>
        <Text>
          Il salvataggio passa comunque dai campi ufficiali del profilo sincronizzati con /api/profiles/me, come sul web.
        </Text>
      </View>

      <Link href="/settings" asChild>
        <Pressable style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16 }}>
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Apri Impostazioni → Zona di interesse</Text>
        </Pressable>
      </Link>

      <Link href={profileHref} asChild>
        <Pressable style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16 }}>
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>{profileLabel}</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
