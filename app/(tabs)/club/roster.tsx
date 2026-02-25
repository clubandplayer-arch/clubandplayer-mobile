import { useCallback, useEffect, useMemo, useState } from "react";
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

import { fetchClubRoster, updateClubRoster, type ClubRosterItem } from "../../../src/lib/api";
import { theme } from "../../../src/theme";

function getApiErrorMessage(errorText: string | undefined, status: number): string {
  if (!errorText) return `Errore (${status})`;
  try {
    const parsed = JSON.parse(errorText) as { message?: string; error?: string };
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
    if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
  } catch {
    // noop
  }
  return errorText;
}

export default function ClubRosterScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [items, setItems] = useState<ClubRosterItem[]>([]);

  const loadRoster = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    setError(null);

    try {
      const response = await fetchClubRoster();
      if (!response.ok) {
        setItems([]);
        setError(getApiErrorMessage(response.errorText, response.status));
        return;
      }

      const roster = Array.isArray(response.data?.roster) ? response.data.roster : [];
      setItems(roster);
    } catch (e: any) {
      setItems([]);
      setError(e?.message ? String(e.message) : "Errore caricamento rosa");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRoster("initial");
  }, [loadRoster]);

  const onRemove = useCallback(
    async (item: ClubRosterItem) => {
      setRemovingId(item.playerProfileId);
      const response = await updateClubRoster({
        playerProfileId: item.playerProfileId,
        inRoster: false,
      });
      setRemovingId(null);

      if (!response.ok) {
        if (response.status === 400 || response.status === 409) {
          Alert.alert("Rosa", getApiErrorMessage(response.errorText, response.status));
          return;
        }
        Alert.alert("Rosa", "Operazione non riuscita");
        return;
      }

      await loadRoster("refresh");
    },
    [loadRoster],
  );

  const listHeader = useMemo(
    () => (
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
      </View>
    ),
    [error],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: 12 }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          contentContainerStyle={{ paddingBottom: 24 }}
          data={error ? [] : items}
          keyExtractor={(item) => item.playerProfileId}
          ListHeaderComponent={listHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadRoster("refresh")} />}
          renderItem={({ item }) => {
            const subtitle = [item.role, item.sport].filter(Boolean).join(" • ");
            const busy = removingId === item.playerProfileId;
            const name = item.display_name ?? item.full_name ?? "Giocatore";

            return (
              <View
                style={{
                  marginHorizontal: 16,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.neutral100,
                  borderRadius: 12,
                  padding: 12,
                  backgroundColor: theme.colors.background,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  {item.avatar_url ? (
                    <Image
                      source={{ uri: item.avatar_url }}
                      style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: theme.colors.neutral100 }}
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 16 }}>{name}</Text>
                    {subtitle ? <Text style={{ marginTop: 4, color: theme.colors.muted }}>{subtitle}</Text> : null}
                  </View>
                </View>

                <Pressable
                  disabled={busy}
                  onPress={() => void onRemove(item)}
                  style={{
                    marginTop: 10,
                    alignSelf: "flex-start",
                    borderWidth: 1,
                    borderColor: theme.colors.danger,
                    borderRadius: 999,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>{busy ? "Rimozione..." : "Rimuovi"}</Text>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
              <Text style={{ color: theme.colors.muted }}>Nessun giocatore in rosa</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
