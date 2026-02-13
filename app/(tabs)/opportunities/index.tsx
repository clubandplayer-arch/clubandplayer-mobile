import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { fetchOpportunities } from "../../../src/lib/api";
import type { Opportunity } from "../../../src/types/opportunity";

function getClubProfileId(opp: Opportunity): string | null {
  return opp.club_id ?? opp.created_by ?? opp.owner_id ?? null;
}

function formatLocation(opp: Opportunity): string {
  return [opp.city, opp.province, opp.region].filter(Boolean).join(" · ");
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("it-IT");
}

function formatAgeRange(ageMin?: number | null, ageMax?: number | null): string | null {
  if (typeof ageMin === "number" && typeof ageMax === "number") return `${ageMin}-${ageMax}`;
  if (typeof ageMin === "number") return `${ageMin}+`;
  if (typeof ageMax === "number") return `fino a ${ageMax}`;
  return null;
}

function Chip({ label }: { label: string }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 10,
      }}
    >
      <Text style={{ fontSize: 12, color: "#374151" }}>{label}</Text>
    </View>
  );
}

function OpportunityCard({ item }: { item: Opportunity }) {
  const router = useRouter();

  const clubProfileId = getClubProfileId(item);
  const location = formatLocation(item);
  const ageRange = formatAgeRange(item.age_min, item.age_max);

  const opportunityId = String(item.id ?? "").trim();

  const onOpenOpportunity = () => {
    if (!opportunityId) {
      console.warn("[opportunities] missing opportunity id", item);
      return;
    }
    console.warn("[opportunities] push detail", { id: opportunityId });
    router.push({ pathname: "/opportunities/[id]", params: { id: opportunityId } });
  };

  const onOpenClub = () => {
    if (!clubProfileId) return;
    router.push({ pathname: "/clubs/[id]", params: { id: String(clubProfileId) } });
  };

  return (
    <Pressable
      onPress={onOpenOpportunity}
      style={{
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 14,
        padding: 14,
        gap: 10,
        backgroundColor: "#fff",
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>{item.title || "Opportunità"}</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
        {clubProfileId ? (
          <Pressable onPress={(event) => { event.stopPropagation(); onOpenClub(); }}>
            <Text style={{ color: "#1d4ed8", fontWeight: "700" }}>{item.club_name || "Club"}</Text>
          </Pressable>
        ) : (
          <Text style={{ color: "#374151", fontWeight: "700" }}>{item.club_name || "Club"}</Text>
        )}
        {location ? <Text style={{ color: "#6b7280" }}>· {location}</Text> : null}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {item.sport ? <Chip label={item.sport} /> : null}
        {item.role ? <Chip label={item.role} /> : null}
        {ageRange ? <Chip label={ageRange} /> : null}
      </View>

      {!!item.description ? (
        <Text style={{ color: "#374151" }} numberOfLines={3}>
          {item.description}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: "#6b7280", textTransform: "capitalize" }}>{item.status || "-"}</Text>
        <Text style={{ color: "#6b7280" }}>{formatDate(item.created_at)}</Text>
      </View>
    </Pressable>
  );
}

export default function OpportunitiesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLoadMore = useMemo(() => page < pageCount, [page, pageCount]);

  const loadPage = useCallback(async (nextPage: number, mode: "replace" | "append") => {
    if (mode === "replace") setLoading(true);
    else setLoadingMore(true);

    const response = await fetchOpportunities({ page: nextPage, pageSize: 20, sort: "recent" });

    if (!response.ok || !response.data) {
      setError(response.errorText || "Errore nel caricamento opportunità");
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      return;
    }

    setError(null);
    setPage(response.data.page || nextPage);
    setPageCount(response.data.pageCount || 1);
    setItems((prev) => (mode === "append" ? [...prev, ...response.data.data] : response.data.data));

    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadPage(1, "replace");
  }, [loadPage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadPage(1, "replace");
  }, [loadPage]);

  const onEndReached = useCallback(() => {
    if (!canLoadMore || loading || loadingMore) return;
    void loadPage(page + 1, "append");
  }, [canLoadMore, loadPage, loading, loadingMore, page]);

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Opportunità</Text>
        <Text style={{ color: "#b91c1c" }}>{error}</Text>
        <Pressable onPress={() => void loadPage(1, "replace")} style={{ borderWidth: 1, borderRadius: 12, padding: 12, alignItems: "center" }}>
          <Text style={{ fontWeight: "700" }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <OpportunityCard item={item} />}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
      ListHeaderComponent={(
        <View style={{ marginBottom: 10, gap: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: "800" }}>Opportunità</Text>
          <Pressable onPress={() => router.push("/my/applications")}>
            <Text style={{ color: "#1d4ed8", fontWeight: "700" }}>Le mie candidature</Text>
          </Pressable>
        </View>
      )}
      ListEmptyComponent={<Text style={{ color: "#6b7280" }}>Nessuna opportunità disponibile.</Text>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReachedThreshold={0.35}
      onEndReached={onEndReached}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginTop: 10 }} /> : null}
    />
  );
}
