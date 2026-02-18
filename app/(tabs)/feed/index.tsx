import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";

import {
  getFeedPosts,
  getAuthorName,
  getPostText,
  type FeedPost,
} from "../../../src/lib/feed/getFeedPosts";
import { isCertifiedClub } from "../../../src/lib/profiles/certification";
import { on } from "../../../src/lib/events/appEvents";
import { clearSession, useWebSession, useWhoami } from "../../../src/lib/api";
import FeedComposer from "../../../components/feed/FeedComposer";
import FeedVideoPreview from "../../../components/feed/FeedVideoPreview";
import LightboxModal from "../../../components/media/LightboxModal";
import { sharePostById } from "../../../src/lib/sharePost";
import { devWarn } from "../../../src/lib/debug/devLog";
import AdSlot from "../../../components/ads/AdSlot";
import { theme } from "../../../src/theme";

type FeedRow =
  | { type: "post"; key: string; item: FeedPost }
  | { type: "ad"; key: string };

function formatWhen(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function pickProfileIdUuid(input: Array<unknown>): string | null {
  for (const v of input) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (!t) continue;
    if (isUuid(t)) return t;
  }
  return null;
}

function resolveProfilePath(input: { author: any; author_id?: unknown }): string | null {
  const author = input.author ?? null;

  const profileId = pickProfileIdUuid([
    author?.id,
    author?.profile_id,
    author?.profileId,
    author?.profile?.id,
    author?.raw?.id,
    typeof input.author_id === "string" ? input.author_id : null,
  ]);

  if (!profileId) return null;

  const kind = (author?.account_type ?? author?.type ?? "")
    .toString()
    .trim()
    .toLowerCase();

  if (kind === "club" || kind === "clubs") return `/clubs/${profileId}`;
  return `/players/${profileId}`;
}

function resolvePostPath(postId: string | null | undefined): string | null {
  const id = (postId ?? "").toString().trim();
  if (!id) return null;
  return `/posts/${id}`;
}

function Avatar({ url, size = 40 }: { url?: string | null; size?: number }) {
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

function FeedCard({ item, onToast }: { item: FeedPost; onToast?: (message: string) => void }) {
  const router = useRouter();
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  const authorName = getAuthorName(item.author);
  const text = getPostText(item.raw);
  const when = formatWhen(item.created_at);
  const firstMedia = item.media?.[0] ?? null;
  const likeCount = typeof item.likeCount === "number" ? item.likeCount : 0;
  const commentCount = typeof item.commentCount === "number" ? item.commentCount : 0;

  const profilePath = resolveProfilePath({
    author: item.author,
    author_id: (item as any).author_id,
  });

  const postPath = resolvePostPath(item.id);

  const handleShare = async () => {
    try {
      await sharePostById(item.id, onToast);
    } catch (error) {
      devWarn("sharePostById failed", error);
      onToast?.("Condivisione non disponibile");
    }
  };

  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.neutral100,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: 16,
        backgroundColor: theme.colors.background,
        gap: 10,
      }}
    >
      <Pressable
        disabled={!profilePath}
        onPress={() => {
          if (!profilePath) return;
          router.push(profilePath);
        }}
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          opacity: profilePath ? 1 : 0.6,
        }}
      >
        <Avatar url={item.author?.avatar_url ?? null} size={40} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: theme.colors.text }}>
              {authorName}
            </Text>
            {item.author && isCertifiedClub(item.author) ? (
              <Text style={{ fontSize: 11, fontWeight: "900", color: theme.colors.text }}>
                C
              </Text>
            ) : null}
          </View>
          <Text style={{ ...theme.typography.small, color: theme.colors.muted }}>{when}</Text>
        </View>
      </Pressable>

      <View style={{ gap: 10 }}>
        {!!text ? (
          <Pressable
            disabled={!postPath}
            onPress={() => {
              if (!postPath) return;
              router.push(postPath);
            }}
          >
            <Text style={{ fontSize: 14, lineHeight: 19, color: theme.colors.text }}>{text}</Text>
          </Pressable>
        ) : null}

        {firstMedia?.url ? (
          <Pressable
            onPress={() => {
              setLightbox({ open: true, index: 0 });
            }}
            style={{
              borderRadius: theme.radius.md,
              overflow: "hidden",
              backgroundColor: theme.colors.neutral100,
            }}
          >
            {firstMedia.media_type === "video" ? (
              <FeedVideoPreview
                uri={firstMedia.url}
                posterUri={firstMedia.poster_url || (firstMedia as any).posterUrl}
              />
            ) : (
              <Image
                source={{ uri: firstMedia.poster_url || firstMedia.url }}
                style={{ width: "100%", aspectRatio: 4 / 5 }}
                resizeMode="cover"
              />
            )}
            <View style={{ padding: 10 }}>
              <Text style={{ ...theme.typography.small, color: theme.colors.muted }}>
                {firstMedia.media_type === "video" ? "🎬 Video" : "🖼️ Foto"}
                {item.media.length > 1 ? ` • +${item.media.length - 1}` : ""}
              </Text>
            </View>
          </Pressable>
        ) : null}
      </View>

      <LightboxModal
        visible={lightbox.open}
        items={item.media ?? []}
        initialIndex={lightbox.index}
        onClose={() => setLightbox({ open: false, index: 0 })}
      />

      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        <Text style={{ ...theme.typography.small, color: theme.colors.muted }}>👍 {likeCount}</Text>
        <Text style={{ ...theme.typography.small, color: theme.colors.muted }}>💬 {commentCount}</Text>
        <Pressable onPress={handleShare}>
          <Text style={{ ...theme.typography.smallStrong, color: theme.colors.text }}>Condividi</Text>
        </Pressable>
      </View>
    </View>
  );
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
  const timerRef = useRef<any>(null);

  const web = useWebSession();
  const whoami = useWhoami(web.ready);

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
    setLoading(true);
    load(feedMode);
  }, [feedMode, load, web.error, web.ready]);

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
      <View style={{ padding: theme.spacing.xl, paddingBottom: 12, gap: 16, backgroundColor: theme.colors.background }}>
        <Text style={{ ...theme.typography.h1, color: theme.colors.primary, fontFamily: theme.fonts.brand }}>
          Feed
        </Text>

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

        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            borderRadius: theme.radius.md,
            padding: 16,
            gap: 10,
            backgroundColor: theme.colors.background,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.text }}>Accesso</Text>

          {web.loading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator />
              <Text style={{ color: theme.colors.text }}>Verifico sessione web…</Text>
            </View>
          ) : web.error ? (
            <>
              <Text style={{ color: theme.colors.danger }}>Sessione web non disponibile.</Text>
              <Pressable
                onPress={web.retry}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                  borderRadius: theme.radius.sm,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Riprova</Text>
              </Pressable>
            </>
          ) : whoami.data?.user ? (
            <>
              <Text style={{ color: theme.colors.text }}>
                Sei loggato.{" "}
                {whoami.data?.role ? <Text style={{ fontWeight: "700" }}>{whoami.data.role}</Text> : null}
              </Text>

              <Pressable
                onPress={onLogout}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radius.sm,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: theme.colors.background, fontWeight: "700" }}>Logout</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ color: theme.colors.text }}>Non risulti loggato. Vai al login.</Text>
              <Pressable
                onPress={() => router.replace("/(auth)/login")}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                  borderRadius: theme.radius.sm,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Vai al login</Text>
              </Pressable>
            </>
          )}
        </View>

        <FeedComposer onPosted={refetchFeed} />

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

  if (loading || web.loading) {
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

        return <FeedCard item={item.item} onToast={showFlash} />;
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
