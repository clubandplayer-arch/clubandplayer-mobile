import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { fetchMyApplications } from "../../src/lib/api";

type ApplicationStatus =
  | "all"
  | "submitted"
  | "seen"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "pending"
  | "in_review"
  | string;

type ApplicationsFilter = "all" | "submitted" | "accepted" | "rejected";

const FILTERS: ApplicationsFilter[] = ["all", "submitted", "accepted", "rejected"];

type ApplicationItem = {
  id: string;
  opportunity_id: string;
  status: ApplicationStatus;
  created_at?: string | null;
  note?: string | null;
  club_id?: string | null;
  opportunity?: {
    id: string;
    title?: string | null;
    club_id?: string | null;
    club_name?: string | null;
    role?: string | null;
  } | null;
};

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function statusLabel(s: ApplicationStatus) {
  const v = String(s || "").toLowerCase();
  if (v === "submitted") return "Inviata";
  if (v === "seen") return "Visualizzata";
  if (v === "accepted") return "Accettata";
  if (v === "rejected") return "Rifiutata";
  if (v === "withdrawn") return "Ritirata";
  if (v === "pending" || v === "in_review") return "In valutazione";
  return s ? String(s) : "—";
}

function filterLabel(status: ApplicationsFilter) {
  if (status === "all") return "Tutte";
  if (status === "submitted") return "Inviate";
  if (status === "accepted") return "Accettate";
  if (status === "rejected") return "Rifiutate";
  return status;
}

function normalizeApplicationItem(input: any): ApplicationItem {
  return {
    id: String(input?.id ?? ""),
    opportunity_id: String(input?.opportunity_id ?? input?.opportunity?.id ?? ""),
    status: (input?.status ?? "submitted") as ApplicationStatus,
    created_at: typeof input?.created_at === "string" ? input.created_at : null,
    note: typeof input?.note === "string" ? input.note : null,
    club_id: typeof input?.club_id === "string" ? input.club_id : null,
    opportunity: input?.opportunity
      ? {
          id: String(input.opportunity.id ?? input.opportunity_id ?? ""),
          title: typeof input.opportunity.title === "string" ? input.opportunity.title : null,
          club_id: typeof input.opportunity.club_id === "string" ? input.opportunity.club_id : null,
          club_name: typeof input.opportunity.club_name === "string" ? input.opportunity.club_name : null,
          role: typeof input.opportunity.role === "string" ? input.opportunity.role : null,
        }
      : null,
  };
}

function sortByCreatedAtDesc(items: ApplicationItem[]): ApplicationItem[] {
  return [...items].sort((a, b) => {
    const at = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bt - at;
  });
}

export default function MyApplicationsScreen() {
  const router = useRouter();

  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ApplicationsFilter>("all");

  const fetchMine = useCallback(async (mode: "initial" | "refresh") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);

      const response = await fetchMyApplications({ status: selectedFilter });
      if (!response.ok) {
        throw new Error(response.errorText || `HTTP ${response.status || 500}`);
      }

      const normalized = (response.data ?? [])
        .map((it) => normalizeApplicationItem(it))
        .filter((it) => it.id && it.opportunity_id);

      setItems(sortByCreatedAtDesc(normalized));
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Errore nel caricamento");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]);

  useFocusEffect(
    useCallback(() => {
      void fetchMine("initial");
    }, [fetchMine]),
  );

  const emptyState = useMemo(() => {
    if (loading) return null;
    if (error) return null;
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "600" }}>Nessuna candidatura</Text>
        <Text style={{ marginTop: 6, opacity: 0.7 }}>
          Quando ti candidi a un’opportunità, la trovi qui con lo stato aggiornato.
        </Text>
      </View>
    );
  }, [loading, error]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Errore</Text>
        <Text style={{ marginTop: 6, opacity: 0.8 }}>{error}</Text>
        <Pressable
          onPress={() => void fetchMine("initial")}
          style={{ marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 }}
        >
          <Text style={{ fontWeight: "600" }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
        {FILTERS.map((filter) => {
          const active = filter === selectedFilter;
          return (
            <Pressable
              key={filter}
              onPress={() => setSelectedFilter(filter)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
                borderWidth: 1,
                opacity: active ? 1 : 0.7,
              }}
            >
              <Text style={{ fontWeight: active ? "700" : "500" }}>{filterLabel(filter)}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void fetchMine("refresh")} />}
        ListEmptyComponent={emptyState}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => {
          const title = item.opportunity?.title ?? "Opportunità";
          const club = item.opportunity?.club_name ?? "Club";
          const role = item.opportunity?.role ?? "";
          const when = formatDate(item.created_at);
          const status = statusLabel(item.status);

          return (
            <Pressable
              onPress={() => {
                if (item.opportunity_id) {
                  router.push(`/opportunities/${item.opportunity_id}`);
                }
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                opacity: item.opportunity_id ? 1 : 0.6,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700" }}>{title}</Text>
              <Text style={{ marginTop: 4, opacity: 0.8 }}>
                {club}
                {role ? ` • ${role}` : ""}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, marginRight: 10 }}>
                  <Text style={{ fontWeight: "600" }}>{status}</Text>
                </View>
                {!!when && <Text style={{ opacity: 0.7 }}>{when}</Text>}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
