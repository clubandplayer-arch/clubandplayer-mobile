import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { getWebBaseUrl } from "../../src/lib/api";

function buildUrl(path: string) {
  return `${getWebBaseUrl()}${path}`;
}

type ApplicationStatus =
  | "submitted"
  | "seen"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "pending"
  | "in_review"
  | string;

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
  if (v === "seen") return "Vista";
  if (v === "accepted") return "Accettata";
  if (v === "rejected") return "Rifiutata";
  if (v === "withdrawn") return "Ritirata";
  if (v === "pending" || v === "in_review") return "In valutazione";
  return s ? String(s) : "—";
}

export default function MyApplicationsScreen() {
  const router = useRouter();

  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMine = useCallback(async (mode: "initial" | "refresh") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);

      const res = await fetch(buildUrl("/api/applications/mine"), {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-store",
        },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof json?.error === "string"
          ? json.error
          : typeof json?.message === "string"
            ? json.message
            : `HTTP ${res.status}`;
        throw new Error(message);
      }

      const data = (json?.data ?? json) as ApplicationItem[] | undefined;
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Errore nel caricamento");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
