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
import { supabase } from "../../../src/lib/supabase";

import {
  getFeedPosts,
  getAuthorName,
  getPostText,
  type FeedPost,
} from "../../../src/lib/feed/getFeedPosts";

function formatWhen(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "";
  }
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

function FeedCard({
  item,
  onOpenAuthor,
  onOpenPost,
}: {
  item: FeedPost;
  onOpenAuthor: (authorId: string) => void;
  onOpenPost: (postId: string) => void;
}) {
  const authorName = getAuthorName(item.author);
  const text = getPostText(item.raw);
  const when = formatWhen(item.created_at);
  const firstMedia = item.media?.[0] ?? null;

  const authorId = (item.author_id ?? "").toString();

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
      <Pressable
        onPress={() => authorId && onOpenAuthor(authorId)}
        disabled={!authorId}
        style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
      >
        <Avatar url={item.author?.avatar_url ?? null} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>
            {authorName}
          </Text>
          <Text style={{ fontSize: 12, color: "#6b7280" }}>{when}</Text>
        </View>
      </Pressable>

      {!!text ? (
        <Pressable onPress={() => onOpenPost(item.id)}>
          <Text style={{ fontSize: 14, lineHeight: 19, color: "#111827" }}>
            {text}
          </Text>
        </Pressable>
      ) : null}

      {firstMedia?.url ? (
        <Pressable onPress={() => onOpenPost(item.id)}>
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
        </Pressable>
      ) : null}
    </View>
  );
}

export default function FeedScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [email, setEmail] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<"all" | "following">("all");
  const [followedCount, setFollowedCount] = useState<number | null>(null);

  const [items, setItems] = useState<FeedPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setNextOffset(0);
    setLoadingMore(false);
    setFollowedCount(null);

    try {
      const { data, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        setEmail(null);
      } else {
        setEmail(data.user?.email ?? null);
      }

      const res = await getFeedPosts(supabase, {
        limit: 15,
        offset: 0,
        mode: feedMode,
      });
      setItems(res.items);
      setNextOffset(res.nextOffset);
      setFollowedCount(res.meta.followedCount ?? null);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Errore nel caricamento feed");
      setItems([]);
      setNextOffset(null);
      setFollowedCount(null);
    } finally {
      setLoading(false);
    }
  }, [feedMode]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    if (nextOffset == null) return;
    if (refreshing) return;
    if (loading) return;
    if (error) return;

    try {
      setLoadingMore(true);
      const res = await getFeedPosts(supabase, {
        limit: 15,
        offset: nextOffset,
        mode: feedMode,
      });
      setItems((prev) => [...prev, ...res.items]);
      setNextOffset(res.nextOffset);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Errore nel caricamento feed");
    } finally {
      setLoadingMore(false);
    }
  }, [error, feedMode, loading, loadingMore, nextOffset, refreshing]);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onLogout = async () => {
    try {
      const { error: signOutErr } = await supabase.auth.signOut();
      if (signOutErr) {
        Alert.alert("Errore", "Logout fallito");
        return;
      }
      router.replace("/(auth)/login");
    } catch {
      Alert.alert("Errore", "Logout fallito");
    }
  };

  const header = useMemo(() => {
    const isFollowing = feedMode === "following";
    const emptyMessage =
      isFollowing && followedCount === 0
        ? "Non segui ancora nessuno."
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

          {loading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator />
              <Text>Verifico sessione…</Text>
            </View>
          ) : email ? (
            <>
              <Text style={{ color: "#111827" }}>
                Sei loggato come:{" "}
                <Text style={{ fontWeight: "700" }}>{email}</Text>
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

        <View
          style={{
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 12,
            padding: 16,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700" }}>Azioni rapide</Text>

          <Pressable
            onPress={() => router.push("/(tabs)/create")}
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "700" }}>Crea post</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)/search")}
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "700" }}>Cerca</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)/notifications")}
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "700" }}>Notifiche</Text>
          </Pressable>
        </View>

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
            <Pressable onPress={load} style={{ alignSelf: "flex-start" }}>
              <Text
                style={{ color: "#036f9a", fontWeight: "800" }}
              >
                Riprova
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              padding: 16,
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700" }}>Contenuti</Text>
            <Text style={{ color: "#374151" }}>
              {emptyMessage}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }, [
    email,
    error,
    feedMode,
    followedCount,
    items.length,
    load,
    loading,
    onLogout,
    router,
  ]);

  const footer = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={{ paddingVertical: 18, alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: "#6b7280" }}>
            Carico altri post…
          </Text>
        </View>
      );
    }
    if (nextOffset == null && items.length > 0) {
      return (
        <View style={{ paddingVertical: 18, alignItems: "center" }}>
          <Text style={{ color: "#6b7280" }}>Hai visto tutto ✅</Text>
        </View>
      );
    }
    return <View style={{ height: 16 }} />;
  }, [items.length, loadingMore, nextOffset]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <ActivityIndicator />
        <Text style={{ color: "#6b7280" }}>Caricamento feed…</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(it) => it.id}
      renderItem={({ item }) => (
        <FeedCard
          item={item}
          onOpenAuthor={(authorId) => router.push(`/profile/${authorId}`)}
          onOpenPost={(postId) => router.push(`/post/${postId}`)}
        />
      )}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReachedThreshold={0.6}
      onEndReached={loadMore}
    />
  );
}
