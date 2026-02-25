import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";

import { useWebSession } from "../../../src/lib/api";
import { theme } from "../../../src/theme";

// NOTE: riusiamo la stessa base URL web del resto dell’app
const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "https://www.clubandplayer.com";

type SuggestionItem = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  account_type?: string | null;
  type?: string | null;
  country?: string | null;
  city?: string | null;
  sport?: string | null;
};

type SuggestionsResponse = {
  items?: SuggestionItem[];
  data?: SuggestionItem[];
  nextCursor?: string | null;
  role?: string | null;
  ok?: boolean;
  code?: string;
  message?: string;
};

function getName(p: SuggestionItem) {
  return (p.display_name ?? p.full_name ?? "").trim() || "Profilo";
}

function isClubProfile(p: SuggestionItem) {
  const t = (p.account_type ?? p.type ?? "").toString().toLowerCase().trim();
  return t === "club" || t === "clubs";
}

function Avatar({ url, size = 44 }: { url?: string | null; size?: number }) {
  if (!url) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.neutral200,
        }}
      />
    );
  }
  return (
    <Image
      source={{ uri: url }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.neutral200,
      }}
    />
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const web = useWebSession();

  const [tab, setTab] = useState<"club" | "player">("club");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<SuggestionItem[]>([]);
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});

  const fetchSuggestions = useCallback(async () => {
    if (!web.ready) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${WEB_BASE_URL}/api/follows/suggestions`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        // NB: in RN i cookie vengono gestiti dall’app/session bridge già esistente.
      });

      const json = (await res.json()) as SuggestionsResponse;

      if (!res.ok) {
        setError(json?.message ?? "Errore nel caricamento suggerimenti");
        setItems([]);
        return;
      }

      const list = (json.items ?? json.data ?? []) as SuggestionItem[];
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Errore nel caricamento suggerimenti");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [web.ready]);

  useEffect(() => {
    // carica appena la web session è pronta
    if (!web.ready) return;
    fetchSuggestions();
  }, [fetchSuggestions, web.ready]);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      const isClub = isClubProfile(p);
      return tab === "club" ? isClub : !isClub;
    });
  }, [items, tab]);

  const toggleFollow = useCallback(
    async (targetProfileId: string) => {
      if (!web.ready) return;
      if (!targetProfileId) return;

      setPendingIds((prev) => ({ ...prev, [targetProfileId]: true }));

      try {
        const res = await fetch(`${WEB_BASE_URL}/api/follows/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetProfileId }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          Alert.alert("Errore", json?.message ?? "Operazione non riuscita");
          return;
        }

        // UX semplice: dopo “Segui”, rimuoviamo il profilo dai suggerimenti
        setItems((prev) => prev.filter((x) => x.id !== targetProfileId));
      } catch {
        Alert.alert("Errore", "Operazione non riuscita");
      } finally {
        setPendingIds((prev) => {
          const next = { ...prev };
          delete next[targetProfileId];
          return next;
        });
      }
    },
    [web.ready],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Spacer TOP per non stare attaccati al divider della shell */}
      <View style={{ paddingTop: 12 }} />

      {/* Header page (senza BrandHeader / senza titolo grande) */}
      <View style={{ paddingHorizontal: theme.spacing.xl, gap: 10 }}>
        <Text style={{ fontSize: 26, fontWeight: "900", color: theme.colors.text }}>
          Scopri profili
        </Text>
        <Text style={{ color: theme.colors.muted }}>
          Suggerimenti ordinati per zona di interesse (città, provincia, regione).
        </Text>

        {/* Toggle Club / Player (stile web) */}
        <View
          style={{
            flexDirection: "row",
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            borderRadius: theme.radius.pill,
            padding: 4,
            gap: 6,
            backgroundColor: theme.colors.neutral50,
            alignSelf: "flex-start",
          }}
        >
          <Pressable
            onPress={() => setTab("club")}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: theme.radius.pill,
              backgroundColor: tab === "club" ? theme.colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color: tab === "club" ? theme.colors.background : theme.colors.text,
                fontWeight: "800",
              }}
            >
              Club
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTab("player")}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: theme.radius.pill,
              backgroundColor: tab === "player" ? theme.colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color: tab === "player" ? theme.colors.background : theme.colors.text,
                fontWeight: "800",
              }}
            >
              Player
            </Text>
          </Pressable>
        </View>

        {/* Stati */}
        {!web.ready ? (
          <View style={{ paddingVertical: 12, flexDirection: "row", gap: 10, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ color: theme.colors.muted }}>Verifico sessione…</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={{ paddingVertical: 12, flexDirection: "row", gap: 10, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ color: theme.colors.muted }}>Caricamento…</Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.dangerBorder,
              backgroundColor: theme.colors.dangerBg,
              borderRadius: theme.radius.md,
              padding: 14,
              gap: 8,
            }}
          >
            <Text style={{ fontWeight: "900", color: theme.colors.danger }}>Errore</Text>
            <Text style={{ color: theme.colors.danger }}>{error}</Text>
            <Pressable onPress={fetchSuggestions} style={{ alignSelf: "flex-start" }}>
              <Text style={{ color: theme.colors.primary, fontWeight: "900" }}>Riprova</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Lista */}
      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.xl,
          paddingTop: 14,
          paddingBottom: 24,
          gap: 10,
        }}
        renderItem={({ item }) => {
          const name = getName(item);
          const disabled = Boolean(pendingIds[item.id]);

          return (
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.background,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Avatar url={item.avatar_url ?? null} size={44} />

              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 16, fontWeight: "900", color: theme.colors.text }}>
                  {name}
                </Text>
                <Text style={{ color: theme.colors.muted }}>
                  {(item.city ?? "").trim() || "—"} {item.country ? `• ${item.country}` : ""}
                </Text>
              </View>

              <Pressable
                disabled={disabled}
                onPress={() => toggleFollow(item.id)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.neutral200,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.background,
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                <Text style={{ fontWeight: "900", color: theme.colors.text }}>
                  {disabled ? "..." : "Segui"}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading && !error ? (
            <View style={{ paddingTop: 16 }}>
              <Text style={{ color: theme.colors.muted }}>
                Nessun suggerimento disponibile.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}