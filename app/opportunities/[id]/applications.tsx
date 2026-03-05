import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { theme } from "../../../src/theme";
import { resolveDisplayName } from "../../../src/lib/profiles/resolveDisplayName";

import {
  fetchOpportunityApplications,
  fetchWhoami,
  patchApplicationStatus,
  type ApplicationStatus,
  type OpportunityApplicationItem,
} from "../../../src/lib/api";

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
  return resolveDisplayName({
    full_name: item.athlete?.full_name,
    display_name: item.athlete?.display_name,
    fallback: "Utente",
  });
}

function athleteProfileId(item: OpportunityApplicationItem): string | null {
  const athlete = item.athlete as Record<string, unknown> | null | undefined;
  const raw = athlete?.athlete_profile_id ?? athlete?.id ?? item.athlete_id;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

const STATUS_OPTIONS: ApplicationStatus[] = ["submitted", "seen", "accepted", "rejected"];

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
        setItems(response.data);
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
      const buttons = STATUS_OPTIONS.map((status) => ({
        text: statusLabel(status),
        onPress: async () => {
          try {
            setActingId(appId);
            const response = await patchApplicationStatus(appId, status);
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
      <View style={{ padding: 16 }}>
        <Text style={{ fontWeight: "700" }}>Nessuna candidatura per questa opportunità.</Text>
      </View>
    );
  }, [error, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {error ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: theme.colors.danger }}>{error}</Text>
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

          return (
            <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 }}>
              <Pressable disabled={!profileId} onPress={() => profileId && router.push(`/players/${profileId}` as any)}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.primary }}>{athleteLabel(item)}</Text>
              </Pressable>

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
