import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";

import BrandHeader from "../../../src/components/brand/BrandHeader";
import { fetchClubRoster, updateClubRoster, type ClubRosterItem } from "../../../src/lib/api";
import { theme } from "../../../src/theme";

type RosterRow = ClubRosterItem & { id: string; name: string };

function normalizeRosterItem(item: unknown, index: number): RosterRow {
  const row = (item ?? {}) as Record<string, unknown>;
  const playerProfileId = String(
    row.playerProfileId ?? row.player_profile_id ?? row.profile_id ?? row.id ?? "",
  ).trim();
  const displayName = typeof row.display_name === "string" ? row.display_name.trim() : "";
  const fullName = typeof row.full_name === "string" ? row.full_name.trim() : "";
  const name = displayName || fullName || "Giocatore";
  return {
    ...(row as ClubRosterItem),
    playerProfileId,
    id: playerProfileId || `roster-item-${index}`,
    name,
  };
}

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
  const [items, setItems] = useState<RosterRow[]>([]);

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

      const rawRoster = Array.isArray(response.data?.roster) ? response.data?.roster : [];
      setItems(rawRoster.map((item, index) => normalizeRosterItem(item, index)));
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
    async (item: RosterRow) => {
      if (!item.playerProfileId) {
        Alert.alert("Rosa", "ID giocatore non valido");
        return;
      }

      setRemovingId(item.id);
      const response = await updateClubRoster({
        playerProfileId: item.playerProfileId,
        inRoster: false,
      });
      setRemovingId(null);

      if (!response.ok) {
        Alert.alert("Rosa", getApiErrorMessage(response.errorText, response.status));
        return;
      }

      await loadRoster("refresh");
    },
    [loadRoster],
  );

  const header = useMemo(
    () => (
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <BrandHeader subtitle="Rosa" />
        {error ? <Text style={{ marginTop: 8, color: theme.colors.danger }}>{error}</Text> : null}
      </View>
    ),
    [error],
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingBottom: 24 }}
      data={error ? [] : items}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadRoster("refresh")} />}
      renderItem={({ item }) => {
        const subtitle = [item.role, item.sport].filter(Boolean).join(" • ");
        const busy = removingId === item.id;

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
            <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 16 }}>{item.name}</Text>
            {subtitle ? <Text style={{ marginTop: 4, color: theme.colors.muted }}>{subtitle}</Text> : null}

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
  );
}
