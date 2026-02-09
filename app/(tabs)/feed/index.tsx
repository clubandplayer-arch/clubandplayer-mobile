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
  const likeCount = typeof item.likeCount === "number" ? item.likeCount : 0;
  const commentCount = typeof item.commentCount === "number" ? item.commentCount : 0;

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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>
            {authorName}
          </Text>
          {item.author && isCertifiedClub(item.author) ? (
            <Text style={{ fontSize: 11, fontWeight: "900", color: "#111827" }}>C</Text>
          ) : null}
          </View>
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

      <View style={{ flexDirection: "row", gap: 14 }}>
        <Text style={{ fontSize: 12, color: "#6b7280" }}>👍 {likeCount}</Text>
        <Text style={{ fontSize: 12, color: "#6b7280" }}>💬 {commentCount}</Text>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [feedMode, setFeedMode] = useState<"all" | "following">("all");
  const [reloadToken, setReloadToken] = useState(0);

  const [items, setItems] = useState<FeedPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const load = useCallback(async (mode: "all" | "following") => {
    if (!web.ready) return;
    setError(null);

    try {
      const res = await getFeedPosts({
        mode,
      });
      setItems(res.items);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Errore nel caricamento feed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [web.ready]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void nextSession;
      setLoading(true);
      setReloadToken((prev) => prev + 1);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!web.ready) {
      if (web.error) {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    load(feedMode);
  }, [feedMode, load, reloadToken, web.error, web.ready]);

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
      const { error: signOutErr } = await supabase.auth.signOut();
      if (signOutErr) {
        Alert.alert("Errore", "Logout fallito");
        return;
      }
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
            <Pressable onPress={() => load(feedMode)} style={{ alignSelf: "flex-start" }}>
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
    error,
    feedMode,
    items.length,
    loading,
    onLogout,
    router,
    web.error,
    web.loading,
    web.retry,
    whoami.data?.role,
    whoami.data?.user,
  ]);

  if (loading || web.loading) {
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReachedThreshold={0.6}
    />
  );
}
