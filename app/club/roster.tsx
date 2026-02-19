import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { fetchClubRosterMe, fetchWhoami, postClubRosterToggle, type ClubRosterItem } from "../../src/lib/api";
import { theme } from "../../src/theme";

function playerName(item: ClubRosterItem): string {
  return item.full_name || item.display_name || "Player";
}

export default function ClubRosterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ClubRosterItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const loadRoster = useCallback(async () => {
    clearRetry();
    setError(null);
    setLoading(true);

    const whoami = await fetchWhoami();
    const role = whoami.ok ? whoami.data?.role : null;

    // Debug utile finché chiudiamo B2
    console.log("[club/roster] whoami.role =", role);

    // ✅ Regola robusta:
    // - athlete => fuori subito (non deve accedere)
    // - guest/null/undefined => può essere transitorio: aspetta e riprova
    // - club => ok
    if (role === "athlete") {
      router.replace("/(tabs)/feed");
      return;
    }

    if (role !== "club") {
      retryTimerRef.current = setTimeout(() => {
        void loadRoster();
      }, 600);
      return;
    }

    const response = await fetchClubRosterMe();
    if (!response.ok || !response.data) {
      setItems([]);
      setError(response.errorText || "Errore nel caricamento della rosa");
      setLoading(false);
      return;
    }

    setItems(response.data);
    setLoading(false);
  }, [clearRetry, router]);

  useFocusEffect(
    useCallback(() => {
      void loadRoster();

      return () => {
        // evita retry/setState mentre esci dalla pagina
        clearRetry();
      };
    }, [clearRetry, loadRoster]),
  );

  const onToggle = useCallback(
    async (profileId: string) => {
      try {
        setError(null);
        setActingId(profileId);

        const response = await postClubRosterToggle(profileId);
        if (!response.ok) {
          setError(response.errorText || "Aggiornamento rosa non riuscito");
          return;
        }

        // server-truth: dopo toggle ricarico la rosa
        await loadRoster();
      } finally {
        setActingId(null);
      }
    },
    [loadRoster],
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {error ? (
        <Text style={{ color: theme.colors.danger, paddingHorizontal: 16, paddingTop: 12 }}>{error}</Text>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, gap: 10, flexGrow: items.length ? 0 : 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: theme.colors.muted }}>Nessun player in rosa</Text>
          </View>
        }
        renderItem={({ item }) => {
          const inRoster = item.inRoster !== false;
          const busy = actingId === item.id;

          return (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                borderRadius: 12,
                padding: 10,
                gap: 10,
              }}
            >
              {item.avatar_url ? (
                <Image
                  source={{ uri: item.avatar_url }}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: theme.colors.neutral200,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: theme.colors.neutral200,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
                    {playerName(item).slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}

              <Text style={{ flex: 1, color: theme.colors.text, fontWeight: "600" }}>{playerName(item)}</Text>

              <Pressable
                disabled={busy}
                onPress={() => void onToggle(item.id)}
                style={{
                  backgroundColor: inRoster ? theme.colors.primary : theme.colors.neutral200,
                  borderRadius: 999,
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  opacity: busy ? 0.6 : 1,
                }}
              >
                <Text style={{ color: inRoster ? "white" : theme.colors.text, fontWeight: "700" }}>
                  {busy ? "..." : inRoster ? "In rosa" : "Fuori rosa"}
                </Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}
