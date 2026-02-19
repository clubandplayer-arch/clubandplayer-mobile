import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import {
  fetchClubRoster,
  type ClubRosterPlayer,
  updateClubRosterPlayer,
} from "../../src/lib/clubRoster";
import { useIsClub } from "../../src/hooks/useIsClub";

export default function ClubRosterScreen() {
  const { isClub, loading: loadingRole } = useIsClub();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ClubRosterPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actingPlayerId, setActingPlayerId] = useState<string | null>(null);

  const loadRoster = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    setError(null);

    const response = await fetchClubRoster();
    if (!response.ok || !response.data) {
      setItems([]);
      setError(response.errorText || "Errore nel caricamento della rosa");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setItems(response.data.items);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (loadingRole || !isClub) {
      setLoading(false);
      return;
    }

    void loadRoster("initial");
  }, [isClub, loadRoster, loadingRole]);

  const onToggle = useCallback(
    async (item: ClubRosterPlayer) => {
      if (!item.playerProfileId) return;

      setActingPlayerId(item.playerProfileId);
      setError(null);

      const response = await updateClubRosterPlayer({
        playerProfileId: item.playerProfileId,
        inRoster: !item.inRoster,
      });

      if (!response.ok) {
        setError(response.errorText || "Aggiornamento rosa non riuscito");
        setActingPlayerId(null);
        return;
      }

      await loadRoster("refresh");
      setActingPlayerId(null);
    },
    [loadRoster],
  );

  if (!isClub) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Text style={{ fontSize: 16, textAlign: "center" }}>Devi essere un Club per gestire la rosa.</Text>
      </View>
    );
  }

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
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadRoster("refresh")} />}
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <Text>Nessun giocatore in elenco.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const title = item.fullName || item.displayName || "Giocatore";
          const isBusy = actingPlayerId === item.playerProfileId;

          return (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: "#e5e7eb" }}>
              <Text style={{ fontSize: 16, fontWeight: "700" }}>{title}</Text>
              {item.role ? <Text style={{ marginTop: 2, color: "#6b7280" }}>{item.role}</Text> : null}

              <Pressable
                onPress={() => void onToggle(item)}
                disabled={isBusy}
                style={{
                  marginTop: 10,
                  alignSelf: "flex-start",
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontWeight: "600" }}>
                  {isBusy ? "..." : item.inRoster ? "Rimuovi dalla rosa" : "Aggiungi alla rosa"}
                </Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}
