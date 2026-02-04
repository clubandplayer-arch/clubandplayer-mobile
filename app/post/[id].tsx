import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Pressable,
  Image,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { getAuthorName, getPostText, type FeedAuthor, type FeedMediaItem } from "../../src/lib/feed/getFeedPosts";
import { asString, normalizeMediaRow } from "../../src/lib/media/normalizeMedia";
import { resolveProfileByAuthorId } from "../../src/lib/profiles/resolveProfile";
import { getPostSocial, type PostSocialResult } from "../../src/lib/posts/getPostSocial";

type PostRow = {
  id: string;
  author_id?: string | null;
  created_at?: string | null;
  [k: string]: any;
};

function formatWhen(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

function Avatar({ url, size = 44 }: { url?: string | null; size?: number }) {
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

export default function PostDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const postId = (params.id ?? "").toString();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [post, setPost] = useState<PostRow | null>(null);
  const [author, setAuthor] = useState<FeedAuthor | null>(null);
  const [media, setMedia] = useState<FeedMediaItem[]>([]);
  const [social, setSocial] = useState<PostSocialResult>({
    likeCount: 0,
    commentCount: 0,
    comments: [],
  });

  const when = useMemo(() => formatWhen(post?.created_at ?? null), [post?.created_at]);
  const text = useMemo(() => (post ? getPostText(post as any) : ""), [post]);
  const authorName = useMemo(() => getAuthorName(author), [author]);

  const load = useCallback(async () => {
    setError(null);

    if (!postId) {
      setError("Post non valido.");
      setPost(null);
      setAuthor(null);
      setMedia([]);
      setSocial({ likeCount: 0, commentCount: 0, comments: [] });
      setLoading(false);
      return;
    }

    try {
      // 1) Post
      const { data: postRow, error: postErr } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .maybeSingle();

      if (postErr) throw new Error(postErr.message || "Errore nel recupero post");
      if (!postRow) {
        setError("Post non trovato.");
        setPost(null);
        setAuthor(null);
        setMedia([]);
        setSocial({ likeCount: 0, commentCount: 0, comments: [] });
        return;
      }

      const p = postRow as PostRow;
      setPost(p);

      const socialData = await getPostSocial(postId, supabase);
      setSocial(socialData);

      // 2) Media
      const { data: mediaRows, error: mediaErr } = await supabase
        .from("post_media")
        .select("id, post_id, media_type, url, poster_url, width, height, position")
        .eq("post_id", postId)
        .order("position", { ascending: true });

      if (!mediaErr && Array.isArray(mediaRows)) {
        const normalized: FeedMediaItem[] = mediaRows
          .map((r: any) => normalizeMediaRow(r))
          .filter(Boolean) as FeedMediaItem[];

        setMedia(normalized);
      } else {
        setMedia([]);
      }

      // 3) Author (fallback user_id OR id, come feed)
      const authorId = asString((p as any)?.author_id);
      if (!authorId) {
        setAuthor(null);
        return;
      }

      const resolved = await resolveProfileByAuthorId(authorId, supabase);
      setAuthor(
        resolved
          ? {
              id: resolved.id,
              user_id: resolved.user_id ?? undefined,
              full_name: resolved.full_name,
              display_name: resolved.display_name,
              avatar_url: resolved.avatar_url,
              type: resolved.type,
              account_type: resolved.account_type,
              role: resolved.role,
            }
          : null,
      );
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Errore nel caricamento post");
      setPost(null);
      setAuthor(null);
      setMedia([]);
      setSocial({ likeCount: 0, commentCount: 0, comments: [] });
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const screenW = Dimensions.get("window").width;
  const mediaW = screenW - 48; // padding 24*2
  const mediaH = 260;
  const likeCount = social.likeCount ?? 0;
  const commentCount = social.commentCount ?? 0;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 10,
          }}
        >
          <Text style={{ fontWeight: "800" }}>←</Text>
        </Pressable>

        <Text style={{ fontSize: 20, fontWeight: "900" }} numberOfLines={1}>
          Post
        </Text>
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
          <Text style={{ fontWeight: "900", color: "#b91c1c" }}>Errore</Text>
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              load();
            }}
            style={{ alignSelf: "flex-start" }}
          >
            <Text style={{ color: "#036f9a", fontWeight: "900" }}>Riprova</Text>
          </Pressable>
        </View>
      ) : null}

      {!error && post ? (
        <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 16, gap: 12 }}>
          {/* Author */}
          <Pressable
            onPress={() => {
              const id = (post.author_id ?? "").toString();
              if (id) router.push(`/profile/${id}`);
            }}
            disabled={!post.author_id}
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <Avatar url={(author as any)?.avatar_url ?? null} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "900" }}>{authorName}</Text>
              <Text style={{ fontSize: 12, color: "#6b7280" }}>{when}</Text>
            </View>
          </Pressable>

          {/* Text */}
          {text ? (
            <Text style={{ fontSize: 14, lineHeight: 19, color: "#111827" }}>{text}</Text>
          ) : null}

          {/* Media gallery */}
          {media.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ borderRadius: 12, overflow: "hidden" }}
            >
              {media.map((m) => (
                <View
                  key={m.id ?? `${m.url}`}
                  style={{
                    width: mediaW,
                    height: mediaH,
                    backgroundColor: "#f3f4f6",
                    marginRight: 12,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <Image
                    source={{ uri: (m.poster_url || m.url) as string }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                  <View
                    style={{
                      position: "absolute",
                      left: 10,
                      bottom: 10,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      backgroundColor: "rgba(0,0,0,0.45)",
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>
                      {m.media_type === "video" ? "🎬 Video" : "🖼️ Foto"}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={{ flexDirection: "row", gap: 14 }}>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>👍 {likeCount}</Text>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>💬 {commentCount}</Text>
          </View>
        </View>
      ) : null}

      {!error && post ? (
        <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "800" }}>Commenti</Text>
          {social.comments.length > 0 ? (
            <View style={{ gap: 12 }}>
              {social.comments.map((comment) => {
                const commentAuthorName = getAuthorName(comment.author);
                const commentWhen = formatWhen(comment.created_at);
                return (
                  <View
                    key={comment.id}
                    style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}
                  >
                    <Avatar url={comment.author?.avatar_url ?? null} size={36} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 14, fontWeight: "700" }}>{commentAuthorName}</Text>
                        <Text style={{ fontSize: 11, color: "#6b7280" }}>{commentWhen}</Text>
                      </View>
                      <Text style={{ fontSize: 13, lineHeight: 18, color: "#111827" }}>
                        {comment.content}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: "#6b7280" }}>Nessun commento ancora.</Text>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}
