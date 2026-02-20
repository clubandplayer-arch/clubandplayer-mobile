import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { fetchOpportunityById } from "../../src/lib/api";
import type { OpportunityDetail } from "../../src/types/opportunity";

import { theme } from "../../src/theme";
function asSingleValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("it-IT");
}

function getClubProfileId(data: OpportunityDetail): string | null {
  const v = (data as any)?.club_profile_id ?? null;
  return v ? String(v) : null;
}

function formatLocation(opp: OpportunityDetail): string {
  return [opp.city, opp.province, opp.region, opp.country].filter(Boolean).join(" · ");
}

function formatAgeRange(ageMin?: number | null, ageMax?: number | null): string | null {
  if (typeof ageMin === "number" && typeof ageMax === "number") return `${ageMin}-${ageMax}`;
  if (typeof ageMin === "number") return `${ageMin}+`;
  if (typeof ageMax === "number") return `fino a ${ageMax}`;
  return null;
}

function Chip({ label }: { label: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
      <Text style={{ color: theme.colors.textSoft, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export default function OpportunityDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = asSingleValue(params.id).trim();

  const [item, setItem] = useState<OpportunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clubProfileId = useMemo(() => (item ? getClubProfileId(item) : null), [item]);

  const load = useCallback(async () => {
    if (!id) {
      setError("ID opportunità non valido");
      setLoading(false);
      return;
    }

    setLoading(true);
    const response = await fetchOpportunityById(id);

    if (!response.ok || !response.data) {
      setError(response.errorText || "Errore nel caricamento dettaglio");
      setLoading(false);
      return;
    }


    setItem(response.data);
    setError(null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Dettaglio opportunità</Text>
        <Text style={{ color: theme.colors.danger }}>{error || "Opportunità non trovata"}</Text>
        <Pressable onPress={() => void load()} style={{ borderWidth: 1, borderRadius: 12, padding: 12, alignItems: "center" }}>
          <Text style={{ fontWeight: "700" }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  const ageRange = formatAgeRange(item.age_min, item.age_max);
  const location = formatLocation(item);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 14 }}>
      <Text style={{ fontSize: 30, fontWeight: "800", color: theme.colors.text }}>{item.title || "Opportunità"}</Text>
      <Text style={{ color: theme.colors.muted }}>
        {(item.status || "-").toUpperCase()} · {formatDate(item.created_at)}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {item.sport ? <Chip label={item.sport} /> : null}
        {item.role ? <Chip label={item.role} /> : null}
        {ageRange ? <Chip label={ageRange} /> : null}
        {item.gender ? <Chip label={item.gender} /> : null}
        {location ? <Chip label={location} /> : null}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Descrizione</Text>
        <Text style={{ color: theme.colors.textSoft, lineHeight: 22 }}>{item.description || "Nessuna descrizione disponibile."}</Text>
      </View>

      {clubProfileId ? (
        <Pressable
          onPress={() => router.push({ pathname: "/clubs/[id]", params: { id: String(clubProfileId) } })}
          style={{ borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: 12, padding: 14 }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.info }}>
            Visita club · {item.club_display_name ?? item.club_name ?? "Club"}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
