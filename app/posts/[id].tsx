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
  getWebBaseUrl,
  useWebSession,
  useWhoami,
} from "../../src/lib/api";
import { getAuthorName, getPostText, type FeedAuthor } from "../../src/lib/feed/getFeedPosts";

const POST_FIELDS =
  "id, content, created_at, author_id, media_url, media_type, media_aspect, link_url, link_title, link_description, link_image, kind, event_payload, quoted_post_id";

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

function buildWebUrl(path: string, params?: Record<string, string>) {
  const base = getWebBaseUrl();
  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
}

function sumCountsObject(value: Record<string, unknown>): number {
  return Object.values(value).reduce<number>((total, item) => {
    const numeric = typeof item === "number" ? item : Number(item);
    return Number.isFinite(numeric) ? total + numeric : total;
  }, 0);
}

function parseCountsForPost(
  counts: unknown,
  postId: string,
): number {
  if (typeof counts === "number" && Number.isFinite(counts)) return counts;

  if (Array.isArray(counts)) {
    const match = counts.find((item) => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Record<string, unknown>;
      return (
        candidate.post_id === postId ||
        candidate.postId === postId ||
        candidate.id === postId
      );
    }) as Record<string, unknown> | undefined;

    if (match) {
      const directCount = match.count ?? match.counts ?? match.reactions_count;
      if (typeof directCount === "number" && Number.isFinite(directCount)) {
        return directCount;
      }
      if (directCount && typeof directCount === "object") {
        return sumCountsObject(directCount as Record<string, unknown>);
      }
    }

    return 0;
  }

  if (counts && typeof counts === "object") {
    return sumCountsObject(counts as Record<string, unknown>);
  }

  return 0;
}

function parseViewerHasLiked(mine: unknown): boolean {
  if (!mine) return false;
  if (typeof mine === "string") return mine.length > 0;
  if (Array.isArray(mine)) return mine.length > 0;
  if (typeof mine === "object") return Object.keys(mine).length > 0;
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
    id: asString(data.id) ?? undefined,
    user_id: asString(data.user_id) ?? undefined,
    full_name: typeof data.full_name === "string" ? data.full_name : null,
    display_name: typeof data.display_name === "string" ? data.display_name : null,
    avatar_url: typeof data.avatar_url === "string" ? data.avatar_url : null,
    account_type: typeof data.account_type === "string" ? data.account_type : null,
    type: typeof data.type === "string" ? data.type : null,
  };
}

async function fetchPostCore(postId: string): Promise<PostDetail | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_FIELDS)
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Errore nel caricamento post");
  }
  if (!data) return null;

  const author = await fetchAuthorProfile(asString(data.author_id));

  return {
    id: asString(data.id) ?? postId,
    author_id: asString(data.author_id),
    created_at: asString(data.created_at),
    quoted_post_id: asString(data.quoted_post_id),
    raw: data as Record<string, any>,
    author,
  };
}

async function fetchReactionSummary(postId: string) {
  const url = buildWebUrl("/api/feed/reactions", {
    postId,
    postIds: postId,
  });
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Errore nel caricamento reazioni");
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const counts =
    typeof payload === "object" && payload
      ? (payload.counts as unknown)
      : null;
  const mine =
    typeof payload === "object" && payload
      ? (payload.mine as unknown)
      : null;

  return {
    likeCount: parseCountsForPost(counts, postId),
    viewerHasLiked: parseViewerHasLiked(mine),
  };
}

async function fetchCommentCounts(postId: string) {
  const url = buildWebUrl("/api/feed/comments/counts", {
    postIds: postId,
  });
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Errore nel caricamento commenti");
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const counts =
    typeof payload === "object" && payload
      ? (payload.counts as unknown)
      : null;
  return parseCountsForPost(counts, postId);
}

async function toggleReaction(postId: string) {
  const url = buildWebUrl("/api/feed/reactions");
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ postId, reaction: "like" }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Errore nel toggle reazioni");
  }

  return (await response.json()) as Record<string, unknown>;
}

function PostCard({ post, title }: { post: PostDetail; title?: string }) {
  const authorName = getAuthorName(post.author);
  const when = formatWhen(post.created_at);
  const text = getPostText(post.raw);
  const mediaUrl = asString(post.raw?.media_url);
  const mediaType = asString(post.raw?.media_type);

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
        <Text style={{ fontSize: 15, lineHeight: 20, color: "#111827" }}>{text}</Text>
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
              {mediaType === "video" ? "🎬 Video" : "🖼️ Media"}
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

  const loadSocial = useCallback(
    async (targetPostId: string) => {
      setSocial((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const [reactionSummary, commentCount] = await Promise.all([
          fetchReactionSummary(targetPostId),
          fetchCommentCounts(targetPostId),
        ]);
        setSocial({
          likeCount: reactionSummary.likeCount,
          commentCount,
          viewerHasLiked: reactionSummary.viewerHasLiked,
          loading: false,
          error: null,
        });
      } catch (err) {
        setSocial((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Errore nel social",
        }));
      }
    },
    [],
  );

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
    try {
      const payload = await toggleReaction(postId);
      const counts = payload?.counts ?? payload;
      setSocial((prev) => ({
        ...prev,
        likeCount: parseCountsForPost(counts, postId),
        viewerHasLiked: !prev.viewerHasLiked,
      }));
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
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: 24,
        }}
      >
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
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#111827",
            alignSelf: "flex-start",
          }}
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
        <Text style={{ color: "#374151" }}>
          Per vedere il dettaglio del post devi effettuare l'accesso.
        </Text>
        <Pressable
          onPress={() => router.replace("/(auth)/login")}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            backgroundColor: "#111827",
            alignSelf: "flex-start",
          }}
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
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#111827",
            alignSelf: "flex-start",
          }}
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
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#111827",
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontWeight: "700", color: "#111827" }}>Indietro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 18 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{
          alignSelf: "flex-start",
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "#e5e7eb",
        }}
      >
        <Text style={{ fontWeight: "700", color: "#111827" }}>← Indietro</Text>
      </Pressable>

      <PostCard post={post} />

      {quotedPost ? <PostCard post={quotedPost} title="Post citato" /> : null}

      <View
        style={{
          borderWidth: 1,
          borderColor: "#e5e7eb",
          borderRadius: 14,
          padding: 16,
          gap: 12,
          backgroundColor: "#f9fafb",
        }}
      >
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
          <Text
            style={{
              color: social.viewerHasLiked ? "#ffffff" : "#111827",
              fontWeight: "700",
            }}
          >
            {social.viewerHasLiked ? "Hai messo 👍" : "Metti 👍"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
