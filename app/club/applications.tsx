import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../src/theme";
import { resolveDisplayName } from "../../src/lib/profiles/resolveDisplayName";

import {
  fetchClubApplicationsReceived,
  fetchWhoami,
  patchApplicationStatus,
  type ReceivedApplicationItem,
} from "../../src/lib/api";

type ClubFilterStatus = "pending" | "all" | "accepted" | "rejected";

const FILTERS: ClubFilterStatus[] = ["pending", "all", "accepted", "rejected"];

function labelForFilter(status: ClubFilterStatus): string {
  if (status === "pending") return "In attesa";
  if (status === "all") return "Tutte";
  if (status === "accepted") return "Accettate";
  return "Rifiutate";
}

function labelForStatus(status?: string | null): string {
  const v = String(status || "").toLowerCase();
  if (v === "submitted") return "Inviata";
  if (v === "seen") return "Visualizzata";
  if (v === "accepted") return "Accettata";
  if (v === "rejected") return "Rifiutata";
  return status ? String(status) : "-";
}

function athleteName(item: ReceivedApplicationItem): string {
  const athlete = item.athlete;
  return resolveDisplayName({
    full_name: athlete?.full_name,
    display_name: athlete?.display_name,
    fallback: "Utente",
  });
}

function athleteProfileId(item: ReceivedApplicationItem): string | null {
  const athlete = item.athlete as Record<string, unknown> | null | undefined;
  const raw =
    athlete?.athlete_profile_id ??
    athlete?.id ??
    (item as Record<string, unknown>).athlete_profile_id ??
    item.athlete_id;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

function opportunityLabel(item: ReceivedApplicationItem): string {
  const opp = item.opportunity;
  const title = opp?.title || "Opportunità";
  const role = opp?.role ? ` • ${opp.role}` : "";
  const location = [opp?.city, opp?.province, opp?.region].filter(Boolean).join(" · ");
  return location ? `${title}${role}\n${location}` : `${title}${role}`;
}

export default function ClubApplicationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ opportunity_id?: string | string[] }>();
  const opportunityId = Array.isArray(params.opportunity_id)
    ? params.opportunity_id[0]?.trim() || ""
    : String(params.opportunity_id ?? "").trim();

  const [status, setStatus] = useState<ClubFilterStatus>("pending");
  const [items, setItems] = useState<ReceivedApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const hasFocusedOnceRef = useRef(false);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      try {
        if (mode === "initial") setLoading(true);
        if (mode === "refresh") setRefreshing(true);
        setError(null);

        const whoami = await fetchWhoami();
        const role = whoami.data?.role;
        if (!whoami.ok || role !== "club") {
          router.replace("/(tabs)/feed");
          return;
        }

        const response = await fetchClubApplicationsReceived({ status, opportunityId });
        if (!response.ok || !response.data) {
          throw new Error(response.errorText || "Errore nel caricamento");
        }

        setItems(response.data);
      } catch (e: any) {
        setItems([]);
        setError(e?.message ? String(e.message) : "Errore nel caricamento");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [opportunityId, router, status],
  );

  useFocusEffect(
    useCallback(() => {
      hasFocusedOnceRef.current = true;
      void load("initial");
    }, [load]),
  );

  useEffect(() => {
    if (!hasFocusedOnceRef.current) return;
    void load("refresh");
  }, [opportunityId, status, load]);

  const empty = useMemo(() => {
    if (loading || error) return null;
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontWeight: "700", fontSize: 16 }}>Nessuna candidatura</Text>
      </View>
    );
  }, [error, loading]);

  const onStatusAction = useCallback(
    async (appId: string, next: "accepted" | "rejected") => {
      try {
        setActingId(appId);
        const response = await patchApplicationStatus(appId, next);
        if (!response.ok) throw new Error(response.errorText || "Aggiornamento non riuscito");
        await load("refresh");
      } catch (e: any) {
        setError(e?.message ? String(e.message) : "Aggiornamento non riuscito");
      } finally {
        setActingId(null);
      }
    },
    [load],
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom + 12 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 12 }}>
        {FILTERS.map((filter) => {
          const active = filter === status;
          return (
            <Pressable
              key={filter}
              onPress={() => setStatus(filter)}
              style={{
                borderWidth: 1,
                borderRadius: 999,
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: active ? theme.colors.text : theme.colors.background,
              }}
            >
              <Text style={{ color: active ? theme.colors.background : theme.colors.text, fontWeight: "600" }}>{labelForFilter(filter)}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ color: theme.colors.danger }}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} />}
        ListEmptyComponent={empty}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        renderItem={({ item }) => {
          const oppId = item.opportunity_id ? String(item.opportunity_id) : null;
          const profileId = athleteProfileId(item);
          const isBusy = actingId === item.id;

          return (
            <View style={{ borderBottomWidth: 1, padding: 14 }}>
              <Pressable disabled={!profileId} onPress={() => profileId && router.push(`/players/${profileId}` as any)}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.primary }}>{athleteName(item)}</Text>
              </Pressable>

              {item.player_headline ? <Text style={{ marginTop: 4, opacity: 0.85 }}>{item.player_headline}</Text> : null}
              {item.player_location ? <Text style={{ marginTop: 2, opacity: 0.65 }}>{item.player_location}</Text> : null}

              <Pressable disabled={!oppId} onPress={() => oppId && router.push(`/opportunities/${oppId}` as any)} style={{ marginTop: 10 }}>
                <Text style={{ color: theme.colors.text }}>{opportunityLabel(item)}</Text>
              </Pressable>

              <Text style={{ marginTop: 8, opacity: 0.75 }}>Stato: {labelForStatus(item.status)}</Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <Pressable
                  disabled={isBusy}
                  onPress={() => void onStatusAction(item.id, "accepted")}
                  style={{ borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}
                >
                  <Text style={{ fontWeight: "600" }}>{isBusy ? "..." : "Accetta"}</Text>
                </Pressable>
                <Pressable
                  disabled={isBusy}
                  onPress={() => void onStatusAction(item.id, "rejected")}
                  style={{ borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}
                >
                  <Text style={{ fontWeight: "600" }}>{isBusy ? "..." : "Rifiuta"}</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
