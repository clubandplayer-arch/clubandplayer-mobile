import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { supabase } from "../../src/lib/supabase";
import {
  fetchCommentCounts,
  fetchReactionsSummary,
  toggleLike,
  useWebSession,
  useWhoami,
} from "../../src/lib/api";
import {
  getAuthorName,
  getPostText,
  type FeedAuthor,
} from "../../src/lib/feed/getFeedPosts";

const POST_FIELDS =
  "id, content, created_at, author_id, media_url, media_type, media_aspect, kind, event_payload, quoted_post_id";

type PostDetail = {
  id: string;
  author_id: string | null;
  created_at: string | null;
  raw: Record<string, any>;
  author: FeedAuthor | null;
  quoted_post_id?: string | null;
};

type SocialState = {
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  loading: boolean;
  error: string | null;
};

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value == null) return null;
  try {
    return String(value);
  } catch {
    return null;
  }
}

function formatWhen(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
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

function sumCountsObject(value: Record<string, unknown>): number {
  return Object.values(value).reduce<number>((total, item) => {
    const numeric = typeof item === "number" ? item : Number(item);
    return Number.isFinite(numeric) ? total + numeric : total;
  }, 0);
}

function parseCountsForPost(counts: unknown, postId: string): number {
  if (typeof counts === "number" && Number.isFinite(counts)) return counts;

  if (counts && typeof counts === "object" && !Array.isArray(counts)) {
    const obj = counts as Record<string, unknown>;

    if (postId in obj) {
      const v = obj[postId];
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return sumCountsObject(v as Record<string, unknown>);
      }
      return 0;
    }

    return sumCountsObject(obj);
  }

  if (Array.isArray(counts)) {
    const match = counts.find((item) => {
      if (!item || typeof item !== "object") return false;
      const c = item as Record<string, unknown>;
      const samePost = c.post_id === postId || c.postId === postId || c.id === postId;
      const isLike = c.reaction === "like";
      return samePost && isLike;
    }) as Record<string, unknown> | undefined;

    if (!match) return 0;

    const directCount = (match as any).count ?? (match as any).counts ?? (match as any).reactions_count;
    if (typeof directCount === "number" && Number.isFinite(directCount)) return directCount;

    if (directCount && typeof directCount === "object") {
      return sumCountsObject(directCount as Record<string, unknown>);
    }

    return 0;
  }

  return 0;
}

function parseViewerHasLiked(mine: unknown, postId: string): boolean {
  if (!mine) return false;

  if (mine && typeof mine === "object" && !Array.isArray(mine)) {
    const obj = mine as Record<string, unknown>;
    if (postId in obj) return Boolean(obj[postId]);
    return Object.values(obj).some(Boolean);
  }

  if (Array.isArray(mine)) {
    return mine.some((item) => {
      if (item === postId) return true;
      if (item && typeof item === "object") {
        const r = item as Record<string, unknown>;
        return r.post_id === postId || r.postId === postId || r.id === postId;
      }
      return false;
    });
  }

  if (typeof mine === "string") return mine.includes(postId) || mine.length > 0;
  return Boolean(mine);
}

async function fetchAuthorProfile(authorId: string | null): Promise<FeedAuthor | null> {
  if (!authorId) return null;

  const primary = await supabase
    .from("profiles")
    .select("id, user_id, full_name, display_name, avatar_url, account_type, type")
    .eq("user_id", authorId)
    .maybeSingle();

  let data = primary.data;
  if (!data && !primary.error) {
    const fallback = await supabase
      .from("profiles")
      .select("id, user_id, full_name, display_name, avatar_url, account_type, type")
      .eq("id", authorId)
      .maybeSingle();
    data = fallback.data;
  }

  if (!data) return null;

  return {
    id: asString((data as any).id) ?? undefined,
    user_id: asString((data as any).user_id) ?? undefined,
    full_name: typeof (data as any).full_name === "string" ? (data as any).full_name : null,
    display_name: typeof (data as any).display_name === "string" ? (data as any).display_name : null,
    avatar_url: typeof (data as any).avatar_url === "string" ? (data as any).avatar_url : null,
    account_type: typeof (data as any).account_type === "string" ? (data as any).account_type : null,
    type: typeof (data as any).type === "string" ? (data as any).type : null,
  };
}

async function fetchPostCore(postId: string): Promise<PostDetail | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_FIELDS)
    .eq("id", postId)
    .maybeSingle();

  if (error) throw new Error(error.message || "Errore nel caricamento post");
  if (!data) return null;

  const author = await fetchAuthorProfile(asString((data as any).author_id));

  return {
    id: asString((data as any).id) ?? postId,
    author_id: asString((data as any).author_id),
    created_at: asString((data as any).created_at),
    quoted_post_id: asString((data as any).quoted_post_id),
    raw: data as Record<string, any>,
    author,
  };
}

function PostCard({ post, title }: { post: PostDetail; title?: string }) {
  const authorName = getAuthorName(post.author);
  const when = formatWhen(post.created_at);
  const text = getPostText(post.raw);
  const mediaUrl = asString((post.raw as any)?.media_url);
  const mediaType = asString((post.raw as any)?.media_type);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 16,
        padding: 16,
        gap: 12,
        backgroundColor: "#ffffff",
      }}
    >
      {title ? (
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#6b7280" }}>
          {title}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Avatar url={post.author?.avatar_url ?? null} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
            {authorName}
          </Text>
          <Text style={{ fontSize: 12, color: "#6b7280" }}>{when}</Text>
        </View>
      </View>

      {text ? (
        <Text style={{ fontSize: 15, lineHeight: 20, color: "#111827" }}>
          {text}
        </Text>
      ) : (
        <Text style={{ fontSize: 14, color: "#9ca3af" }}>
          Nessun contenuto testuale.
        </Text>
      )}

      {mediaUrl ? (
        <View
          style={{
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: "#f3f4f6",
          }}
        >
          <Image
            source={{ uri: mediaUrl }}
            style={{ width: "100%", height: 240 }}
            resizeMode="cover"
          />
          <View style={{ padding: 10 }}>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>
              {mediaType === "video" ? "Video" : "Media"}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();

  const postId = useMemo(() => {
    if (!params.id) return null;
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params.id]);

  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const [post, setPost] = useState<PostDetail | null>(null);
  const [quotedPost, setQuotedPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [social, setSocial] = useState<SocialState>({
    likeCount: 0,
    commentCount: 0,
    viewerHasLiked: false,
    loading: true,
    error: null,
  });

  const [isToggling, setIsToggling] = useState(false);

  const loadSocial = useCallback(async (targetPostId: string) => {
    setSocial((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [reactionsRes, commentsRes] = await Promise.all([
        fetchReactionsSummary(targetPostId),
        fetchCommentCounts(targetPostId),
      ]);

      if (!reactionsRes.ok) throw new Error(reactionsRes.errorText ?? `Reactions HTTP ${reactionsRes.status}`);
      if (!commentsRes.ok) throw new Error(commentsRes.errorText ?? `Comments HTTP ${commentsRes.status}`);

      const counts = (reactionsRes.data as any)?.counts;
      const mine = (reactionsRes.data as any)?.mine;
      const commentCounts = (commentsRes.data as any)?.counts;

      const nextLikeCount = parseCountsForPost(counts, targetPostId);
      const nextMine = parseViewerHasLiked(mine, targetPostId);
      const nextCommentCount = parseCountsForPost(commentCounts, targetPostId);

      // do not overwrite an optimistic like/unlike with empty GET payloads
      setSocial((prev) => {
        const keepLike = prev.likeCount > 0 && nextLikeCount === 0;
        const keepMine = prev.viewerHasLiked && !nextMine;
        return {
          likeCount: keepLike ? prev.likeCount : nextLikeCount,
          commentCount: nextCommentCount,
          viewerHasLiked: keepMine ? prev.viewerHasLiked : nextMine,
          loading: false,
          error: null,
        };
      });
    } catch (err) {
      setSocial((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Errore nel social",
      }));
    }
  }, []);

  const load = useCallback(async () => {
    if (!postId) return;

    setLoading(true);
    setError(null);

    try {
      const core = await fetchPostCore(postId);
      if (!core) {
        setPost(null);
        setQuotedPost(null);
        setError("Post non trovato");
        return;
      }

      setPost(core);

      if (core.quoted_post_id) {
        const quoted = await fetchPostCore(core.quoted_post_id);
        setQuotedPost(quoted);
      } else {
        setQuotedPost(null);
      }

      await loadSocial(postId);
    } catch (err) {
      setPost(null);
      setQuotedPost(null);
      setError(err instanceof Error ? err.message : "Errore nel caricamento post");
    } finally {
      setLoading(false);
    }
  }, [loadSocial, postId]);

  useEffect(() => {
    if (!web.ready) return;
    if (!whoami.data?.user) return;
    void load();
  }, [load, web.ready, whoami.data?.user]);

  const handleRetry = () => {
    if (web.error) {
      web.retry();
      return;
    }
    void load();
  };

  const handleLikeToggle = async () => {
    if (!postId || isToggling) return;
    setIsToggling(true);
    setSocial((prev) => ({ ...prev, error: null }));

    const nextMode: "like" | "unlike" = social.viewerHasLiked ? "unlike" : "like";

    try {
      const res = await toggleLike(postId, nextMode);
      if (!res.ok) throw new Error(res.errorText ?? `Toggle HTTP ${res.status}`);

      const payload = (res.data as any) ?? {};
      const counts = payload.counts ?? payload?.data?.counts ?? payload;
      const mine = payload.mine ?? payload?.data?.mine ?? null;

      const newLikeCount = parseCountsForPost(counts, postId);

      setSocial((prev) => {
        if (nextMode === "like") {
          return {
            ...prev,
            likeCount: newLikeCount || Math.max(prev.likeCount, 1),
            viewerHasLiked: mine ? parseViewerHasLiked(mine, postId) : true,
          };
        }
        return {
          ...prev,
          likeCount: Math.max(0, (newLikeCount || prev.likeCount) - 1),
          viewerHasLiked: false,
        };
      });
    } catch (err) {
      setSocial((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Errore nel like",
      }));
    } finally {
      setIsToggling(false);
      await loadSocial(postId);
    }
  };

  if (web.loading || whoami.loading || loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }}>
        <ActivityIndicator />
        <Text style={{ color: "#6b7280" }}>Caricamento dettaglio…</Text>
      </View>
    );
  }

  if (web.error) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Sessione web</Text>
        <Text style={{ color: "#b91c1c" }}>Sessione web non disponibile.</Text>
        <Pressable
          onPress={handleRetry}
          style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: "#111827", alignSelf: "flex-start" }}
        >
          <Text style={{ fontWeight: "700", color: "#111827" }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (!whoami.data?.user) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 16, justifyContent: "center" }}>
        <Text style={{ fontSize: 20, fontWeight: "800" }}>Login richiesto</Text>
        <Text style={{ color: "#374151" }}>Per vedere il dettaglio del post devi effettuare l'accesso.</Text>
        <Pressable
          onPress={() => router.replace("/(auth)/login")}
          style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: "#111827", alignSelf: "flex-start" }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700" }}>Vai al login</Text>
        </Pressable>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Errore</Text>
        <Text style={{ color: "#b91c1c" }}>{error}</Text>
        <Pressable
          onPress={handleRetry}
          style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: "#111827", alignSelf: "flex-start" }}
        >
          <Text style={{ fontWeight: "700", color: "#111827" }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Post non disponibile</Text>
        <Text style={{ color: "#6b7280" }}>Questo post non esiste o non è accessibile.</Text>
        <Pressable
          onPress={() => router.back()}
          style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: "#111827", alignSelf: "flex-start" }}
        >
          <Text style={{ fontWeight: "700", color: "#111827" }}>Indietro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#ffffff" }} contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 18 }}>
      <Pressable
        onPress={() => router.back()}
        style={{ alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb" }}
      >
        <Text style={{ fontWeight: "700", color: "#111827" }}>← Indietro</Text>
      </Pressable>

      <PostCard post={post} />
      {quotedPost ? <PostCard post={quotedPost} title="Post citato" /> : null}

      <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 16, gap: 12, backgroundColor: "#f9fafb" }}>
        <Text style={{ fontSize: 16, fontWeight: "800" }}>Reazioni</Text>

        {social.loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator size="small" />
            <Text style={{ color: "#6b7280" }}>Caricamento reazioni…</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={{ color: "#374151" }}>👍 {social.likeCount}</Text>
            <Text style={{ color: "#374151" }}>💬 {social.commentCount}</Text>
          </View>
        )}

        {social.error ? <Text style={{ color: "#b91c1c" }}>{social.error}</Text> : null}

        <Pressable
          onPress={handleLikeToggle}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: social.viewerHasLiked ? "#111827" : "#d1d5db",
            backgroundColor: social.viewerHasLiked ? "#111827" : "transparent",
            alignSelf: "flex-start",
            opacity: isToggling ? 0.6 : 1,
          }}
        >
          <Text style={{ color: social.viewerHasLiked ? "#ffffff" : "#111827", fontWeight: "700" }}>
            {social.viewerHasLiked ? "Hai messo 👍" : "Metti 👍"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
