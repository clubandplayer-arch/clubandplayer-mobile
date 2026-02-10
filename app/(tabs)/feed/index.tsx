import { useCallback, useEffect, useMemo, useState } from "react";
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

function formatWhen(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function resolveProfilePath(input: {
  profileId: string | null;
  accountType?: string | null;
  type?: string | null;
}): string | null {
  const profileId = (input.profileId ?? "").toString().trim();
  if (!profileId) return null;

  const kind = (input.accountType ?? input.type ?? "")
    .toString()
    .trim()
    .toLowerCase();
  if (kind === "club") return `/clubs/${profileId}`;
  return `/players/${profileId}`;
}

// IMPORTANT: Post detail route (PR4 parity)
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
          backgroundColor: "#e5e7eb",
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
        backgroundColor: "#e5e7eb",
      }}
    />
  );
}

function FeedCard({ item }: { item: FeedPost }) {
  const router = useRouter();

  const authorName = getAuthorName(item.author);
  const text = getPostText(item.raw);
  const when = formatWhen(item.created_at);
  const firstMedia = item.media?.[0] ?? null;
  const likeCount = typeof item.likeCount === "number" ? item.likeCount : 0;
  const commentCount = typeof item.commentCount === "number" ? item.commentCount : 0;

  const profilePath = resolveProfilePath({
    profileId: item.author?.id ?? item.author_id ?? null,
    accountType: item.author?.account_type ?? null,
    type: item.author?.type ?? null,
  });

  const postPath = resolvePostPath(item.id);

  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: "#ffffff",
        gap: 10,
      }}
    >
      {/* Author area -> profile */}
      <Pressable
        disabled={!profilePath}
        onPress={() => {
          if (!profilePath) return;
          router.push(profilePath);
        }}
        style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
      >
        <Avatar url={item.author?.avatar_url ?? null} size={40} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>
              {authorName}
            </Text>
            {item.author && isCertifiedClub(item.author) ? (
              <Text style={{ fontSize: 11, fontWeight: "900", color: "#111827" }}>
                C
              </Text>
            ) : null}
          </View>
          <Text style={{ fontSize: 12, color: "#6b7280" }}>{when}</Text>
        </View>
      </Pressable>

      {/* Content area -> post detail */}
      <Pressable
        disabled={!postPath}
        onPress={() => {
          if (!postPath) return;
          router.push(postPath);
        }}
        style={{ gap: 10 }}
      >
        {!!text ? (
          <Text style={{ fontSize: 14, lineHeight: 19, color: "#111827" }}>
            {text}
          </Text>
        ) : null}

        {firstMedia?.url ? (
          <View
            style={{
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: "#f3f4f6",
            }}
          >
            <Image
              source={{ uri: firstMedia.poster_url || firstMedia.url }}
              style={{ width: "100%", height: 220 }}
              resizeMode="cover"
            />
            <View style={{ padding: 10 }}>
              <Text style={{ fontSize: 12, color: "#6b7280" }}>
                {firstMedia.media_type === "video" ? "🎬 Video" : "🖼️ Foto"}
                {item.media.length > 1 ? ` • +${item.media.length - 1}` : ""}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", gap: 14 }}>
          <Text style={{ fontSize: 12, color: "#6b7280" }}>👍 {likeCount}</Text>
          <Text style={{ fontSize: 12, color: "#6b7280" }}>💬 {commentCount}</Text>
        </View>
      </Pressable>
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

  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const load = useCallback(
    async (mode: "all" | "following") => {
      if (!web.ready) return;
      setError(null);
      setLoadingMore(false);

      try {
        const res = await getFeedPosts({
          scope: mode,
        });
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
      const res = await getFeedPosts({
        scope: feedMode,
        nextPage,
      });
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
      if (web.error) {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    load(feedMode);
  }, [feedMode, load, web.error, web.ready]);

  useEffect(() => {
    const unsubscribe = on("feed:refresh", () => {
      setLoading(true);
      load(feedMode);
    });

    return unsubscribe;
  }, [feedMode, load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load(feedMode);
    } finally {
      setRefreshing(false);
    }
  }, [feedMode, load]);

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
          padding: 24,
          paddingBottom: 12,
          gap: 16,
          backgroundColor: "#ffffff",
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: "800" }}>Feed</Text>

        <View
          style={{
            flexDirection: "row",
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 999,
            padding: 4,
            gap: 6,
            backgroundColor: "#f9fafb",
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
              borderRadius: 999,
              backgroundColor: feedMode === "all" ? "#111827" : "transparent",
            }}
          >
            <Text
              style={{
                color: feedMode === "all" ? "#ffffff" : "#111827",
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
              borderRadius: 999,
              backgroundColor:
                feedMode === "following" ? "#111827" : "transparent",
            }}
          >
            <Text
              style={{
                color: feedMode === "following" ? "#ffffff" : "#111827",
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
            borderColor: "#e5e7eb",
            borderRadius: 12,
            padding: 16,
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700" }}>Accesso</Text>

          {web.loading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator />
              <Text>Verifico sessione web…</Text>
            </View>
          ) : web.error ? (
            <>
              <Text style={{ color: "#b91c1c" }}>Sessione web non disponibile.</Text>
              <Pressable
                onPress={web.retry}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: "#111827",
                  borderRadius: 10,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: "#111827", fontWeight: "700" }}>
                  Riprova
                </Text>
              </Pressable>
            </>
          ) : whoami.data?.user ? (
            <>
              <Text style={{ color: "#111827" }}>
                Sei loggato.{" "}
                {whoami.data?.role ? (
                  <Text style={{ fontWeight: "700" }}>{whoami.data.role}</Text>
                ) : null}
              </Text>

              <Pressable
                onPress={onLogout}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  backgroundColor: "#111827",
                  borderRadius: 10,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                  Logout
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ color: "#111827" }}>
                Non risulti loggato. Vai al login.
              </Text>
              <Pressable
                onPress={() => router.replace("/(auth)/login")}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: "#111827",
                  borderRadius: 10,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: "#111827", fontWeight: "700" }}>
                  Vai al login
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {items.length === 0 && !error ? (
          <Text style={{ color: "#6b7280" }}>{emptyMessage}</Text>
        ) : null}

        {error ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#fecaca",
              backgroundColor: "#fff5f5",
              borderRadius: 12,
              padding: 14,
              gap: 8,
            }}
          >
            <Text style={{ fontWeight: "800", color: "#b91c1c" }}>Errore</Text>
            <Text style={{ color: "#b91c1c" }}>{error}</Text>
            <Pressable onPress={() => load(feedMode)} style={{ alignSelf: "flex-start" }}>
              <Text style={{ color: "#036f9a", fontWeight: "800" }}>
                Riprova
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }, [
    error,
    feedMode,
    items.length,
    load,
    onLogout,
    router,
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
          <Text style={{ marginTop: 8, color: "#6b7280" }}>Carico altri post…</Text>
        </View>
      );
    }
    if (!nextPage && items.length > 0) {
      return (
        <View style={{ paddingVertical: 18, alignItems: "center" }}>
          <Text style={{ color: "#6b7280" }}>Hai visto tutto ✅</Text>
        </View>
      );
    }
    return <View style={{ height: 16 }} />;
  }, [items.length, loadingMore, nextPage]);

  if (loading || web.loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
        <ActivityIndicator />
        <Text style={{ color: "#6b7280" }}>Caricamento feed…</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(it) => it.id}
      renderItem={({ item }) => <FeedCard item={item} />}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReachedThreshold={0.6}
      onEndReached={loadMore}
      style={{ backgroundColor: "#ffffff" }}
    />
  );
}
