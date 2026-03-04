import { useMemo, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import FollowButton from "../../src/components/follow/FollowButton";
import { isUuid, useWebSession, useWhoami } from "../../src/lib/api";
import { theme } from "../../src/theme";

type ProfileRow = {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  sport?: string | null;
  role?: string | null;
  country?: string | null;
  birth_year?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  foot?: string | null;
  interest_city?: string | null;
  interest_province?: string | null;
  interest_region?: string | null;
  interest_country?: string | null;
  bio?: string | null;
  [key: string]: unknown;
};

const getTextValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getNumberValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export default function PlayerProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const id = useMemo(() => {
    const raw = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;
    if (!raw) return null;
    const v = String(raw).trim();
    return isUuid(v) ? v : null;
  }, [params.id]);

  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const isLoading = loading || web.loading || whoami.loading;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!id) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const res = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();

      if (!mounted) return;
      setProfile(res.data ? (res.data as ProfileRow) : null);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [id]);

  const displayName = isLoading
    ? "Caricamento…"
    : getTextValue(profile?.full_name) || getTextValue(profile?.display_name) || "Player";
  const avatarUrl = getTextValue(profile?.avatar_url);
  const sport = getTextValue(profile?.sport);
  const role = getTextValue(profile?.role);
  const sportRole = [sport, role].filter(Boolean).join(" • ") || "—";

  const nationality = getTextValue(profile?.country) || "—";
  const birthYear = getNumberValue(profile?.birth_year);
  const currentYear = new Date().getFullYear();
  const age = birthYear ? String(currentYear - birthYear) : "—";

  const heightCm = getNumberValue(profile?.height_cm);
  const weightKg = getNumberValue(profile?.weight_kg);
  const height = heightCm ? `${heightCm} cm` : "—";
  const weight = weightKg ? `${weightKg} kg` : "—";
  const foot = getTextValue(profile?.foot) || "—";

  const interestParts = [
    getTextValue(profile?.interest_city),
    getTextValue(profile?.interest_province),
    getTextValue(profile?.interest_region),
    getTextValue(profile?.interest_country),
  ].filter(Boolean) as string[];
  const interestLocation = interestParts.join(" • ") || "—";

  const biography = getTextValue(profile?.bio) || "—";

  if (!id) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Profilo non valido</Text>
        <Text style={{ color: theme.colors.muted }}>Questo percorso richiede un UUID valido.</Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.text,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>Indietro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>
        <Text style={{ fontWeight: "700", color: theme.colors.text }}>← Indietro</Text>
      </Pressable>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          backgroundColor: theme.colors.neutral50,
          padding: 16,
          gap: 14,
        }}
      >
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.neutral200 }}
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: theme.colors.neutral200,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontWeight: "800", color: theme.colors.muted, fontSize: 20 }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={{ flex: 1, gap: 8 }}>
            <Text style={{ fontSize: 24, fontWeight: "900", color: theme.colors.text }}>{displayName}</Text>
            <View
              style={{
                alignSelf: "flex-start",
                borderRadius: 999,
                backgroundColor: theme.colors.neutral200,
                paddingVertical: 4,
                paddingHorizontal: 10,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.text }}>Player</Text>
            </View>
            <Text style={{ color: theme.colors.muted }}>{sportRole}</Text>
            <Text style={{ color: theme.colors.muted }}>{[nationality, interestLocation].filter(Boolean).join(" • ")}</Text>
          </View>
        </View>

        <FollowButton targetProfileId={id} />
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          backgroundColor: theme.colors.neutral50,
          padding: 16,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Dati player</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 14, columnGap: 12 }}>
          {[
            { label: "Età", value: age },
            { label: "Altezza", value: height },
            { label: "Peso", value: weight },
            { label: "Piede", value: foot },
            { label: "Sport", value: sport || "—" },
            { label: "Ruolo", value: role || "—" },
            { label: "Nazionalità", value: nationality },
            { label: "Zona di interesse", value: interestLocation },
          ].map((item) => (
            <View key={item.label} style={{ width: "48%", gap: 4 }}>
              <Text style={{ fontSize: 12, color: theme.colors.muted }}>{item.label}</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.text }}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          backgroundColor: theme.colors.neutral50,
          padding: 16,
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Biografia</Text>
        <Text style={{ color: theme.colors.text, lineHeight: 22 }}>{biography}</Text>
      </View>

      {loading ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator size="small" />
          <Text style={{ color: theme.colors.muted }}>Carico profilo…</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
