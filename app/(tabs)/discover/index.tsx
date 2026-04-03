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
import { theme } from "../../../src/theme";
import { useWebSession } from "../../../src/lib/api";
import { getProfileDisplayName } from "../../../src/lib/profiles/getProfileDisplayName";

const WEB_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "https://www.clubandplayer.com";

type SuggestionItem = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  account_type?: string | null;
  type?: string | null;
  name?: string | null;

  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;

  sport?: string | null;
  role?: string | null;
};

type SuggestionsResponse = {
  items?: SuggestionItem[];
  data?: SuggestionItem[];
  nextCursor?: string | null;
  ok?: boolean;
  code?: string;
  message?: string;
};

function isClubProfile(p: SuggestionItem) {
  const t = (p.account_type ?? p.type ?? "").toString().toLowerCase().trim();
  return t === "club" || t === "clubs";
}

function humanizeName(p: SuggestionItem) {
  return getProfileDisplayName(p);
}

function compactParts(parts: Array<string | null | undefined>) {
  return parts
    .map((x) => (x ?? "").toString().trim())
    .filter((x) => x.length > 0);
}

function formatMetaLine(p: SuggestionItem) {
  const location = compactParts([p.city, p.province, p.region, p.country]).join(" • ");
  const sportRole = compactParts([p.sport, p.role]).join(" • ");

  if (sportRole && location) return `${sportRole}  —  ${location}`;
  if (sportRole) return sportRole;
  if (location) return location;
  return "—";
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<SuggestionItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});

  const mergeUnique = useCallback((prev: SuggestionItem[], next: SuggestionItem[]) => {
    const seen = new Set(prev.map((x) => x.id));
    const out = [...prev];
    for (const it of next) {
      if (!it?.id) continue;
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      out.push(it);
    }
    return out;
  }, []);

  const fetchSuggestions = useCallback(
    async ({ reset }: { reset: boolean }) => {
      if (!web.ready) return;

      const cursor = reset ? null : nextCursor;

      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        if (!cursor) return;
        setLoadingMore(true);
      }

      try {
        const roleParam = tab === "club" ? "club" : "athlete";
        const base = `${WEB_BASE_URL}/api/follows/suggestions?role=${encodeURIComponent(roleParam)}&limit=50`;

        const url =
          cursor ? `${base}&cursor=${encodeURIComponent(cursor)}`
                 : base;

        const res = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        const json = (await res.json()) as SuggestionsResponse;

        if (!res.ok) {
          setError(json?.message ?? "Errore nel caricamento suggerimenti");
          if (reset) setItems([]);
          return;
        }

        const list = (json.items ?? json.data ?? []) as SuggestionItem[];
        const safe = Array.isArray(list) ? list : [];
        if (__DEV__) {
          console.log("[discover][suggestions]", {
            reset,
            tab,
            roleParam,
            got: safe.length,
            nextCursor: (json as any)?.nextCursor ?? null,
            url,
          });
        }

        setItems((prev) => (reset ? safe : mergeUnique(prev, safe)));
        setNextCursor((json as any)?.nextCursor ?? null);
      } catch (e: any) {
        setError(e?.message ? String(e.message) : "Errore nel caricamento suggerimenti");
        if (reset) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [mergeUnique, nextCursor, web.ready, tab],
  );

  useEffect(() => {
    if (!web.ready) return;
    fetchSuggestions({ reset: true });
  }, [fetchSuggestions, web.ready]);

  const filtered = useMemo(() => {
    return items.filter((p) => (tab === "club" ? isClubProfile(p) : !isClubProfile(p)));
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
          credentials: "include",
          body: JSON.stringify({ targetProfileId }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          Alert.alert("Errore", json?.message ?? "Operazione non riuscita");
          return;
        }

        // UX: dopo “Segui” togli il profilo dalla lista
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

      <View style={{ paddingHorizontal: theme.spacing.xl, gap: 10 }}>
        <Text style={{ fontSize: 30, fontWeight: "900", color: theme.colors.primary }}>
          Chi seguire
        </Text>

        {/* Toggle Club / Player */}
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
            onPress={() => {
              if (tab === "club") return;
              setItems([]);
              setNextCursor(null);
              setError(null);
              setTab("club");
            }}
            style={{
              minHeight: 34,
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: theme.radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: tab === "club" ? theme.colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color: tab === "club" ? theme.colors.background : theme.colors.muted,
                fontWeight: "800",
              }}
            >
              Club
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (tab === "player") return;
              setItems([]);
              setNextCursor(null);
              setError(null);
              setTab("player");
            }}
            style={{
              minHeight: 34,
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: theme.radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: tab === "player" ? theme.colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color: tab === "player" ? theme.colors.background : theme.colors.muted,
                fontWeight: "800",
              }}
            >
              Player
            </Text>
          </Pressable>
        </View>

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
            <Pressable onPress={() => fetchSuggestions({ reset: true })} style={{ alignSelf: "flex-start" }}>
              <Text style={{ color: theme.colors.primary, fontWeight: "900" }}>Riprova</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.xl,
          paddingTop: 14,
          paddingBottom: 24,
          gap: 10,
        }}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (loadingMore) return;
          if (!nextCursor) return;
          fetchSuggestions({ reset: false });
        }}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <ActivityIndicator />
              <Text style={{ marginTop: 8, color: theme.colors.muted }}>Carico altri profili…</Text>
            </View>
          ) : <View style={{ height: 8 }} />
        }
        renderItem={({ item }) => {
          const name = humanizeName(item);
          const meta = formatMetaLine(item);
          const disabled = Boolean(pendingIds[item.id]);

          return (
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.primarySoft,
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
                <Pressable
                  onPress={() => {
                    const profilePath = isClubProfile(item) ? "/clubs/[id]" : "/players/[id]";
                    router.push({ pathname: profilePath as any, params: { id: item.id } });
                  }}
                  hitSlop={6}
                  style={{ alignSelf: "flex-start" }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "900", color: theme.colors.primary }}>
                    {name}
                  </Text>
                </Pressable>
                <Text style={{ color: theme.colors.muted }}>{meta}</Text>
              </View>

              <Pressable
                disabled={disabled}
                onPress={() => toggleFollow(item.id)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.primarySoft,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.background,
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                <Text style={{ fontWeight: "900", color: theme.colors.primary }}>
                  {disabled ? "..." : "Segui"}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading && !error ? (
            <View style={{ paddingTop: 16 }}>
              <Text style={{ color: theme.colors.muted }}>Nessun suggerimento disponibile.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
