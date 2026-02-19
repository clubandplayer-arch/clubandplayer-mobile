import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import {
  fetchClubRoster,
  postClubRosterToggle,
  type ClubRosterItem,
} from "../../src/lib/api";

type GateState = "none" | "club-only";

function getPlayerProfileId(item: ClubRosterItem): string | null {
  const raw =
    item.playerProfileId ??
    (typeof item.id === "string" ? item.id : null) ??
    (typeof item.profileId === "string" ? item.profileId : null);

  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value.length ? value : null;
}

function getPlayerName(item: ClubRosterItem): string {
  return item.display_name || item.full_name || "Giocatore";
}

export default function ClubRosterScreen() {
  const [items, setItems] = useState<ClubRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<GateState>("none");
  const [actingPlayerId, setActingPlayerId] = useState<string | null>(null);

  const loadRoster = useCallback(async (mode: "initial" | "refresh") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);

      const response = await fetchClubRoster();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setGate("club-only");
          setItems([]);
          return;
        }

        throw new Error(response.errorText || "Errore nel caricamento rosa");
      }

      setGate("none");
      setItems(response.data ?? []);
    } catch (e: any) {
      setItems([]);
      setError(e?.message ? String(e.message) : "Errore nel caricamento rosa");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRoster("initial");
  }, [loadRoster]);

  const onToggle = useCallback(
    async (item: ClubRosterItem, nextInRoster: boolean) => {
      const playerProfileId = getPlayerProfileId(item);
      if (!playerProfileId) {
        setError("Giocatore non valido: playerProfileId mancante.");
        return;
      }

      try {
        setActingPlayerId(playerProfileId);
        setError(null);

        const response = await postClubRosterToggle({
          playerProfileId,
          inRoster: nextInRoster,
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setGate("club-only");
            setItems([]);
            return;
          }
          throw new Error(response.errorText || "Aggiornamento rosa non riuscito");
        }

        await loadRoster("refresh");
      } catch (e: any) {
        setError(e?.message ? String(e.message) : "Aggiornamento rosa non riuscito");
      } finally {
        setActingPlayerId(null);
      }
    },
    [loadRoster],
  );

  const emptyText = useMemo(() => {
    if (loading || gate === "club-only" || error) return null;
    return "Nessun giocatore in rosa.";
  }, [error, gate, loading]);

  if (gate === "club-only") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={{ fontSize: 16, textAlign: "center" }}>
          Devi essere un Club per gestire la rosa.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 10 }}>
        <ActivityIndicator />
        <Text>Caricamento rosa…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {error ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
          <Pressable onPress={() => void loadRoster("refresh")} style={{ marginTop: 8 }}>
            <Text style={{ color: "#1d4ed8", fontWeight: "700" }}>Riprova</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item, index) => {
          const id = getPlayerProfileId(item);
          return id ? `roster-${id}` : `roster-index-${index}`;
        }}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshing={refreshing}
        onRefresh={() => void loadRoster("refresh")}
        ListEmptyComponent={
          emptyText ? (
            <View style={{ padding: 16 }}>
              <Text>{emptyText}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const playerProfileId = getPlayerProfileId(item);
          const isBusy = !!playerProfileId && actingPlayerId === playerProfileId;

          return (
            <View style={{ borderBottomWidth: 1, borderBottomColor: "#e5e7eb", padding: 14, gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "700" }}>{getPlayerName(item)}</Text>
              {item.role ? <Text style={{ color: "#4b5563" }}>Ruolo: {item.role}</Text> : null}
              {item.position ? <Text style={{ color: "#4b5563" }}>Posizione: {item.position}</Text> : null}
              {playerProfileId ? <Text style={{ color: "#6b7280", fontSize: 12 }}>ID: {playerProfileId}</Text> : null}

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  disabled={isBusy || !playerProfileId}
                  onPress={() => void onToggle(item, false)}
                  style={{
                    borderWidth: 1,
                    borderColor: "#111827",
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    opacity: isBusy || !playerProfileId ? 0.5 : 1,
                  }}
                >
                  <Text style={{ fontWeight: "600" }}>{isBusy ? "..." : "Rimuovi"}</Text>
                </Pressable>

                <Pressable
                  disabled={isBusy || !playerProfileId}
                  onPress={() => void onToggle(item, true)}
                  style={{
                    borderWidth: 1,
                    borderColor: "#111827",
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    opacity: isBusy || !playerProfileId ? 0.5 : 1,
                  }}
                >
                  <Text style={{ fontWeight: "600" }}>{isBusy ? "..." : "Aggiungi"}</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
