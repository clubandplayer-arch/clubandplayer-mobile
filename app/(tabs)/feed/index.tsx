import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";

import {
  getFeedPosts,
  type FeedPost,
} from "../../../src/lib/feed/getFeedPosts";
import { on } from "../../../src/lib/events/appEvents";
import { clearSession, useWebSession, useWhoami } from "../../../src/lib/api";
import FeedComposer from "../../../components/feed/FeedComposer";
import AdSlot from "../../../components/ads/AdSlot";
import FeedCard from "../../../src/components/feed/FeedCard";
import { theme } from "../../../src/theme";

type FeedRow =
  | { type: "post"; key: string; item: FeedPost }
  | { type: "ad"; key: string };
const FEED_UGC_TERMS_ACCEPTED_KEY = "feed_ugc_terms_accepted_v1";
const FEED_UGC_BANNER_DISMISSED_KEY = "feed_ugc_banner_dismissed_v1";

function getWhoamiUserId(user: unknown): string | null {
  if (!user || typeof user !== "object") return null;
  const candidate = (user as any).id ?? (user as any).user_id ?? null;
  if (typeof candidate !== "string") return null;
  const normalized = candidate.trim();
  return normalized || null;
}

export default function FeedScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [feedMode, setFeedMode] = useState<"all" | "following">("all");

  const [items, setItems] = useState<FeedPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [flash, setFlash] = useState<string | null>(null);
  const [ugcAccepted, setUgcAccepted] = useState<boolean | null>(null);
  const [ugcBannerDismissed, setUgcBannerDismissed] = useState(false);
  const timerRef = useRef<any>(null);

  const web = useWebSession();
  const whoami = useWhoami(web.ready);
  const currentUserId = getWhoamiUserId(whoami.data?.user);
  const isFan = String((whoami.data as { role?: unknown } | null)?.role ?? "").toLowerCase().trim() === "fan";

  useEffect(() => {
    AsyncStorage.getItem(FEED_UGC_TERMS_ACCEPTED_KEY)
      .then((value) => setUgcAccepted(value === "1"))
      .catch(() => setUgcAccepted(false));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(FEED_UGC_BANNER_DISMISSED_KEY)
      .then((value) => setUgcBannerDismissed(value === "1"))
      .catch(() => setUgcBannerDismissed(false));
  }, []);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setFlash(null), 2200);
  }, []);

  const load = useCallback(
    async (mode: "all" | "following") => {
      if (!web.ready) return;
      setError(null);
      setLoadingMore(false);

      try {
        const res = await getFeedPosts({ scope: mode });
        setItems(res.items);
        setNextPage(res.nextPage);
      } catch (e: any) {
        setError(e?.message ? String(e.message) : "Errore nel caricamento feed");
        setItems([]);
        setNextPage(null);
      } finally {
        setLoading(false);
      }
    },
    [web.ready],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    if (!nextPage) return;
    if (refreshing) return;
    if (loading) return;
    if (error) return;

    try {
      setLoadingMore(true);
      const res = await getFeedPosts({ scope: feedMode, nextPage });
      setItems((prev) => [...prev, ...res.items]);
      setNextPage(res.nextPage);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Errore nel caricamento feed");
    } finally {
      setLoadingMore(false);
    }
  }, [error, feedMode, loading, loadingMore, nextPage, refreshing]);

  useEffect(() => {
    if (!web.ready) {
      if (web.error) setLoading(false);
      return;
    }
    if (ugcAccepted !== true) return;
    setLoading(true);
    load(feedMode);
  }, [feedMode, load, ugcAccepted, web.error, web.ready]);

  useEffect(() => {
    const unsubscribeRefresh = on("feed:refresh", () => {
      setLoading(true);
      load(feedMode);
    });

    const unsubscribeFollow = on("follow:changed", (payload: any) => {
      const following = Boolean(payload?.following);
      if (feedMode === "following" && !following) {
        showFlash("Non segui più questo profilo: è normale che sparisca da “Seguiti”.");
      } else if (feedMode === "following" && following) {
        showFlash("Seguito! Aggiorno “Seguiti”…");
      }
      setLoading(true);
      load(feedMode);
    });

    return () => {
      unsubscribeRefresh();
      unsubscribeFollow();
    };
  }, [feedMode, load, showFlash]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load(feedMode);
    } finally {
      setRefreshing(false);
    }
  }, [feedMode, load]);

  const refetchFeed = useCallback(async () => {
    await onRefresh();
  }, [onRefresh]);

  const patchPostInFeed = useCallback((postId: string, patch: Partial<Record<string, unknown>>) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== postId) return row;
        const nextRaw = { ...((row.raw as any) ?? {}), ...patch } as any;
        return { ...row, raw: nextRaw };
      }),
    );
  }, []);

  const removePostFromFeed = useCallback((postId: string) => {
    setItems((prev) => prev.filter((row) => row.id !== postId));
  }, []);

  const removeAuthorPostsFromFeed = useCallback((authorProfileId: string) => {
    setItems((prev) =>
      prev.filter((row) => {
        const raw = (row.raw as any) ?? {};
        const rowAuthorId = raw?.author_profile?.id ?? raw?.author_profile_id ?? raw?.authorId ?? raw?.author_id ?? null;
        return rowAuthorId !== authorProfileId;
      }),
    );
  }, []);

  const onLogout = async () => {
    try {
      await clearSession();
      router.replace("/(auth)/login");
    } catch {
      Alert.alert("Errore", "Logout fallito");
    }
  };

  const header = useMemo(() => {
    const isFollowing = feedMode === "following";
    const emptyMessage = isFollowing
      ? "Nessun contenuto nel feed dei seguiti."
      : "Nessun contenuto ancora. Qui compariranno i post delle persone e dei club che segui.";

    return (
      <View
        style={{
          paddingHorizontal: theme.spacing.xl,
          paddingTop: 12,
          paddingBottom: 12,
          gap: 12,
          backgroundColor: theme.colors.background,
        }}
      >
        {ugcAccepted && !ugcBannerDismissed ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.neutral200,
              backgroundColor: theme.colors.neutral50,
              borderRadius: theme.radius.md,
              padding: 12,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <Text style={{ ...theme.typography.strong, color: theme.colors.text, flex: 1 }}>
                Usando Club & Player accetti i Termini di utilizzo. Non sono tollerati contenuti offensivi o utenti abusivi.
              </Text>
              <Pressable
                onPress={async () => {
                  setUgcBannerDismissed(true);
                  await AsyncStorage.setItem(FEED_UGC_BANNER_DISMISSED_KEY, "1");
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                hitSlop={6}
              >
                <Text style={{ color: theme.colors.muted, fontSize: 18, fontWeight: "700", lineHeight: 18 }}>✕</Text>
              </Pressable>
            </View>
            <Text
              style={{ color: theme.colors.primary, fontWeight: "700" }}
              onPress={() => void WebBrowser.openBrowserAsync("https://www.clubandplayer.com/legal/terms")}
            >
              Apri Termini di utilizzo
            </Text>
          </View>
        ) : null}
        {flash ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.neutral200,
              backgroundColor: theme.colors.neutral50,
              borderRadius: theme.radius.md,
              padding: 12,
            }}
          >
            <Text style={{ ...theme.typography.strong, color: theme.colors.text }}>{flash}</Text>
          </View>
        ) : null}

        <View
          style={{
            width: "100%",
            borderRadius: theme.radius.md,
            backgroundColor: "#036f9a",
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>
              Sei un’attività e vuoi farti conoscere da club e player?
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 4 }}>
              Sponsorizza su Club &amp; Player: richiedi informazioni in 30 secondi.
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/sponsor")}
            style={{
              borderRadius: 10,
              backgroundColor: "#ffffff",
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: "#036f9a", fontWeight: "700" }}>Richiedi info</Text>
          </Pressable>
        </View>

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
              if (feedMode !== "all") {
                setLoading(true);
                setFeedMode("all");
              }
            }}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: theme.radius.pill,
              backgroundColor: feedMode === "all" ? theme.colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color: feedMode === "all" ? theme.colors.background : theme.colors.text,
                fontWeight: "700",
              }}
            >
              Tutti
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (feedMode !== "following") {
                setLoading(true);
                setFeedMode("following");
              }
            }}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: theme.radius.pill,
              backgroundColor: feedMode === "following" ? theme.colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color: feedMode === "following" ? theme.colors.background : theme.colors.text,
                fontWeight: "700",
              }}
            >
              Seguiti
            </Text>
          </Pressable>
        </View>

        {ugcAccepted && !isFan ? <FeedComposer onPosted={refetchFeed} /> : null}

        {items.length === 0 && !error ? (
          <Text style={{ color: theme.colors.muted }}>{emptyMessage}</Text>
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
            <Text style={{ fontWeight: "800", color: theme.colors.danger }}>Errore</Text>
            <Text style={{ color: theme.colors.danger }}>{error}</Text>
            <Pressable onPress={() => load(feedMode)} style={{ alignSelf: "flex-start" }}>
              <Text style={{ color: theme.colors.primary, fontWeight: "800" }}>Riprova</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }, [
    error,
    feedMode,
    flash,
    isFan,
    items.length,
    load,
    onLogout,
    refetchFeed,
    router,
    showFlash,
    web.error,
    web.loading,
    web.retry,
    whoami.data?.role,
    whoami.data?.user,
    ugcAccepted,
    ugcBannerDismissed,
  ]);

  const footer = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={{ paddingVertical: 18, alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: theme.colors.muted }}>Carico altri post…</Text>
        </View>
      );
    }
    if (!nextPage && items.length > 0) {
      return (
        <View style={{ paddingVertical: 18, alignItems: "center" }}>
          <Text style={{ color: theme.colors.muted }}>Hai visto tutto ✅</Text>
        </View>
      );
    }
    return <View style={{ height: 16 }} />;
  }, [items.length, loadingMore, nextPage]);

  const rows = useMemo<FeedRow[]>(() => {
    const out: FeedRow[] = [];

    items.forEach((item, index) => {
      out.push({
        type: "post",
        key: `post-${item.id}`,
        item,
      });

      if ((index + 1) % 3 === 0) {
        out.push({
          type: "ad",
          key: `ad-after-${index + 1}`,
        });
      }
    });

    return out;
  }, [items]);

  if (ugcAccepted === null || web.loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
        <ActivityIndicator />
        <Text style={{ color: theme.colors.muted }}>Preparazione feed…</Text>
      </View>
    );
  }

  if (!ugcAccepted) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 24, justifyContent: "center", gap: 14 }}>
        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16, gap: 10 }}>
          <Text style={{ fontWeight: "800", fontSize: 18, color: theme.colors.text }}>Prima di accedere ai contenuti UGC</Text>
          <Text style={{ color: theme.colors.text }}>
            Usando Club & Player accetti i Termini di utilizzo. Non sono tollerati contenuti offensivi o utenti abusivi.
          </Text>
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }} onPress={() => void WebBrowser.openBrowserAsync("https://www.clubandplayer.com/legal/terms")}>
            Apri Termini di utilizzo
          </Text>
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }} onPress={() => void WebBrowser.openBrowserAsync("https://www.clubandplayer.com/legal/privacy")}>
            Apri Privacy Policy
          </Text>
          <Pressable
            onPress={async () => {
              await AsyncStorage.setItem(FEED_UGC_TERMS_ACCEPTED_KEY, "1");
              setUgcAccepted(true);
              setLoading(true);
            }}
            style={{ marginTop: 4, backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ color: theme.colors.background, fontWeight: "800" }}>Accetto e continuo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
        <ActivityIndicator />
        <Text style={{ color: theme.colors.muted }}>Caricamento feed…</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(it) => it.key}
      renderItem={({ item }) => {
        if (item.type === "ad") {
          return <AdSlot slot="feed_infeed" page="feed" />;
        }

        return (
          <FeedCard
            item={item.item}
            onToast={showFlash}
            currentUserId={currentUserId}
            onPatchPost={patchPostInFeed}
            onRemovePost={removePostFromFeed}
            onBlockAuthor={removeAuthorPostsFromFeed}
          />
        );
      }}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReachedThreshold={0.6}
      onEndReached={loadMore}
      style={{ backgroundColor: theme.colors.background }}
    />
  );
}
