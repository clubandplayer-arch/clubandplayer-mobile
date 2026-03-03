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
import { clearSession, isUuid, useWebSession, useWhoami } from "../../../src/lib/api";
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

  const post = (item?.raw as any) ?? (item as any);
  const authorIdRaw = post?.author_profile?.id ?? post?.author_profile_id ?? post?.authorId ?? post?.author_id ?? null;

  const authorUuid =
    (typeof post?.author_profile?.id_uuid === "string" ? post.author_profile.id_uuid : null) ??
    (typeof (post as any)?.author_profile_id_uuid === "string" ? (post as any).author_profile_id_uuid : null) ??
    authorIdRaw;

  const authorRoleRaw = (post as any)?.author_role ?? (post as any)?.authorRole ?? null;
  const authorRole = typeof authorRoleRaw === "string" ? authorRoleRaw.toLowerCase().trim() : null;
  const isAuthorClub = authorRole === "club";

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
        borderBottomColor: theme.colors.neutral200,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: theme.colors.background,
        gap: 10,
      }}
    >
      <Pressable
        onPress={() => {
          console.log("[PR-MOB.PROFILES.2.1][tap-author]", {
            authorIdRaw,
            authorUuid,
            isUuid: authorUuid ? isUuid(authorUuid) : false,
            postKeys: Object.keys(post ?? {}),
          });

          if (!authorUuid || !isUuid(authorUuid)) {
            console.log("[PR-MOB.PROFILES.2.1][tap-author][skip]", "missing valid uuid");
            return;
          }

          const target =
            authorRole === null ? `/profiles/${authorUuid}` : isAuthorClub ? `/clubs/${authorUuid}` : `/players/${authorUuid}`;
          console.log("[PR-MOB.PROFILES.2.2][tap-author][target]", { authorUuid, authorRole, target });
          router.navigate(target);
        }}
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          opacity: authorUuid && isUuid(authorUuid) ? 1 : 0.6,
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
          <Text style={{ ...theme.typography.smallStrong, color: theme.colors.primary }}>Condividi</Text>
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
      <View
        style={{
          paddingHorizontal: theme.spacing.xl,
          paddingTop: 12,        // 🔥 AGGIUNGI QUESTA RIGA
          paddingBottom: 12,
          gap: 12,
          backgroundColor: theme.colors.background,
        }}
      >

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
