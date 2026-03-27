import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { theme } from "../../../src/theme";
import { getProfileDisplayName } from "../../../src/lib/profiles/getProfileDisplayName";

import {
  fetchOpportunityApplications,
  fetchWhoami,
  patchApplicationStatus,
  type OpportunityApplicationItem,
} from "../../../src/lib/api";
import { supabase } from "../../../src/lib/supabase";

function asSingle(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function statusLabel(value?: string | null): string {
  const v = String(value || "").toLowerCase();
  if (v === "submitted") return "Inviata";
  if (v === "seen") return "Visualizzata";
  if (v === "accepted") return "Accettata";
  if (v === "rejected") return "Rifiutata";
  return value ? String(value) : "-";
}

function athleteLabel(item: OpportunityApplicationItem): string {
  return getProfileDisplayName({ ...(item.athlete ?? {}), account_type: "athlete" });
}

function athleteProfileId(item: OpportunityApplicationItem): string | null {
  const athlete = item.athlete as Record<string, unknown> | null | undefined;
  const raw = athlete?.athlete_profile_id ?? athlete?.id ?? item.athlete_id;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

const STATUS_ACTIONS: Array<{ label: string; value: "submitted" | "accepted" | "rejected" }> = [
  { label: "In valutazione", value: "submitted" },
  { label: "Accettata", value: "accepted" },
  { label: "Rifiutata", value: "rejected" },
];

async function enrichAthletesFromProfiles(items: OpportunityApplicationItem[]): Promise<OpportunityApplicationItem[]> {
  const athleteIds = Array.from(
    new Set(
      items
        .map((item) => String(item.athlete_id ?? "").trim())
        .filter(Boolean),
    ),
  );

  if (athleteIds.length === 0) return items;

  const [byId, byUserId] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,user_id,display_name,full_name,avatar_url")
      .in("id", athleteIds),
    supabase
      .from("profiles")
      .select("id,user_id,display_name,full_name,avatar_url")
      .in("user_id", athleteIds),
  ]);

  const profileRows = [
    ...(Array.isArray(byId.data) ? byId.data : []),
    ...(Array.isArray(byUserId.data) ? byUserId.data : []),
  ] as Array<{
    id?: string | null;
    user_id?: string | null;
    display_name?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  }>;

  const profileMap = new Map<string, (typeof profileRows)[number]>();
  for (const row of profileRows) {
    const profileId = String(row.id ?? "").trim();
    const userId = String(row.user_id ?? "").trim();
    if (profileId) profileMap.set(profileId, row);
    if (userId) profileMap.set(userId, row);
  }

  return items.map((item) => {
    const athleteId = String(item.athlete_id ?? "").trim();
    const profile = profileMap.get(athleteId);
    if (!profile) return item;

    return {
      ...item,
      athlete: {
        ...item.athlete,
        id: item.athlete?.id ?? profile.id ?? athleteId,
        athlete_profile_id: item.athlete?.athlete_profile_id ?? profile.id ?? null,
        display_name: item.athlete?.display_name ?? profile.display_name ?? null,
        full_name: item.athlete?.full_name ?? profile.full_name ?? null,
        avatar_url: item.athlete?.avatar_url ?? profile.avatar_url ?? null,
      },
    };
  });
}

export default function OpportunityApplicationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = asSingle(params.id).trim();

  const [items, setItems] = useState<OpportunityApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      try {
        if (mode === "initial") setLoading(true);
        if (mode === "refresh") setRefreshing(true);
        setError(null);

        const whoami = await fetchWhoami();
        if (!whoami.ok || whoami.data?.role !== "club") {
          router.replace("/(tabs)/feed");
          return;
        }

        if (!id) throw new Error("Opportunità non valida");
        const response = await fetchOpportunityApplications(id);
        if (!response.ok || !response.data) {
          throw new Error(response.errorText || "Errore nel caricamento candidature");
        }
        const enrichedItems = await enrichAthletesFromProfiles(response.data);
        setItems(enrichedItems);
      } catch (e: any) {
        setItems([]);
        setError(e?.message ? String(e.message) : "Errore nel caricamento candidature");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, router],
  );

  useFocusEffect(
    useCallback(() => {
      void load("initial");
    }, [load]),
  );

  const onSelectStatus = useCallback(
    (appId: string) => {
      const buttons = STATUS_ACTIONS.map((status) => ({
        text: status.label,
        onPress: async () => {
          try {
            setActingId(appId);
            const response = await patchApplicationStatus(appId, status.value);
            if (!response.ok) throw new Error(response.errorText || "Aggiornamento non riuscito");
            await load("refresh");
          } catch (e: any) {
            setError(e?.message ? String(e.message) : "Aggiornamento non riuscito");
          } finally {
            setActingId(null);
          }
        },
      }));

      Alert.alert("Cambia stato", "Seleziona il nuovo stato", [
        ...buttons,
        { text: "Annulla", style: "cancel" },
      ]);
    },
    [load],
  );

  const empty = useMemo(() => {
    if (loading || error) return null;
    return (
      <View style={{ padding: 16, gap: 6 }}>
        <Text style={{ fontWeight: "700" }}>Nessuna candidatura per questa opportunità.</Text>
        <Text style={{ color: theme.colors.muted }}>Quando i player si candidano, compariranno qui.</Text>
      </View>
    );
  }, [error, loading]);

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: theme.colors.muted }}>Caricamento candidature…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {error ? (
        <View style={{ padding: 16 }}>
          <View
            style={{
              borderWidth: 1,
              borderColor: "#fecaca",
              backgroundColor: "#fef2f2",
              borderRadius: 10,
              padding: 12,
              gap: 8,
            }}
          >
            <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>Errore nel caricamento candidature</Text>
            <Text style={{ color: theme.colors.danger }}>{error}</Text>
            <Pressable
              onPress={() => void load("initial")}
              style={{ alignSelf: "flex-start", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={{ fontWeight: "600" }}>Riprova</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} />}
        ListEmptyComponent={empty}
        renderItem={({ item }) => {
          const profileId = athleteProfileId(item);
          const busy = actingId === item.id;
          const athleteName = athleteLabel(item);
          const athleteAvatarUrl = typeof item.athlete?.avatar_url === "string" ? item.athlete.avatar_url : null;
          const fallbackInitial = athleteName.trim().slice(0, 1).toUpperCase() || "P";

          return (
            <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {athleteAvatarUrl ? (
                  <Image
                    source={{ uri: athleteAvatarUrl }}
                    style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.neutral100 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: theme.colors.neutral200,
                      backgroundColor: theme.colors.neutral50,
                    }}
                  >
                    <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>{fallbackInitial}</Text>
                  </View>
                )}

                <Pressable disabled={!profileId} onPress={() => profileId && router.push(`/players/${profileId}` as any)}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.primary }}>{athleteName}</Text>
                </Pressable>
              </View>

              <Text style={{ marginTop: 6, opacity: 0.8 }}>Stato: {statusLabel(item.status)}</Text>
              {item.note ? <Text style={{ marginTop: 4, opacity: 0.75 }}>Nota: {item.note}</Text> : null}

              <Pressable
                disabled={busy}
                onPress={() => onSelectStatus(item.id)}
                style={{ marginTop: 10, alignSelf: "flex-start", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
              >
                <Text style={{ fontWeight: "600" }}>{busy ? "Aggiornamento..." : "Cambia stato"}</Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}
