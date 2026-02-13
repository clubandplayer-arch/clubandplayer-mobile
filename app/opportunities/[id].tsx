import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { fetchOpportunityById } from "../../src/lib/api";
import type { OpportunityDetail } from "../../src/types/opportunity";

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
  return data.club_id ?? data.created_by ?? data.owner_id ?? null;
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
    <View style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
      <Text style={{ color: "#374151", fontSize: 12 }}>{label}</Text>
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
        <Text style={{ color: "#b91c1c" }}>{error || "Opportunità non trovata"}</Text>
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
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#111827" }}>{item.title || "Opportunità"}</Text>
      <Text style={{ color: "#6b7280" }}>
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
        <Text style={{ color: "#374151", lineHeight: 22 }}>{item.description || "Nessuna descrizione disponibile."}</Text>
      </View>

      {clubProfileId ? (
        <Pressable
          onPress={() => router.push(`/clubs/${clubProfileId}`)}
          style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 14 }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#1d4ed8" }}>
            Visita club {item.club_name ? `· ${item.club_name}` : ""}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
