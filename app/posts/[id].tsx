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
import { emit } from "../../src/lib/events/appEvents";

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
      if (typeof v === "number") return v;
      if (v && typeof v === "object") return sumCountsObject(v as any);
      return 0;
    }
    return sumCountsObject(obj);
  }

  if (Array.isArray(counts)) {
    const match = counts.find((item) => {
      if (!item || typeof item !== "object") return false;
      const c = item as any;
      return c.post_id === postId && c.reaction === "like";
    }) as any;

    return typeof match?.count === "number" ? match.count : 0;
  }

  return 0;
}

function parseViewerHasLiked(mine: unknown, postId: string): boolean {
  if (!mine) return false;

  if (Array.isArray(mine)) {
    return mine.some((m) => m === postId || m?.post_id === postId);
  }

  if (typeof mine === "object") {
    return Boolean((mine as any)[postId]);
  }

  return false;
}

async function fetchAuthorProfile(authorId: string | null): Promise<FeedAuthor | null> {
  if (!authorId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, display_name, avatar_url, account_type, type")
    .eq("user_id", authorId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    user_id: data.user_id,
    full_name: data.full_name,
    display_name: data.display_name,
    avatar_url: data.avatar_url,
    account_type: data.account_type,
    type: data.type,
  };
}

async function fetchPostCore(postId: string): Promise<PostDetail | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_FIELDS)
    .eq("id", postId)
    .maybeSingle();

  if (error || !data) return null;

  const author = await fetchAuthorProfile(data.author_id);

  return {
    id: data.id,
    author_id: data.author_id,
    created_at: data.created_at,
    quoted_post_id: data.quoted_post_id,
    raw: data,
    author,
  };
}

function PostCard({ post }: { post: PostDetail }) {
  const authorName = getAuthorName(post.author);
  const text = getPostText(post.raw);

  return (
    <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 16, padding: 16, gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Avatar url={post.author?.avatar_url ?? null} />
        <View>
          <Text style={{ fontWeight: "800" }}>{authorName}</Text>
          <Text style={{ color: "#6b7280", fontSize: 12 }}>
            {formatWhen(post.created_at)}
          </Text>
        </View>
      </View>
      {text ? <Text>{text}</Text> : null}
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [social, setSocial] = useState<SocialState>({
    likeCount: 0,
    commentCount: 0,
    viewerHasLiked: false,
    loading: true,
    error: null,
  });
  const [isToggling, setIsToggling] = useState(false);

  const loadSocial = useCallback(async () => {
    const [reactionsRes, commentsRes] = await Promise.all([
      fetchReactionsSummary(id),
      fetchCommentCounts(id),
    ]);

    const likeCount = parseCountsForPost(reactionsRes.data?.counts, id);
    const viewerHasLiked = parseViewerHasLiked(reactionsRes.data?.mine, id);
    const commentCount = parseCountsForPost(commentsRes.data?.counts, id);

    setSocial({
      likeCount,
      viewerHasLiked,
      commentCount,
      loading: false,
      error: null,
    });
  }, [id]);

  useEffect(() => {
    if (!web.ready || !whoami.data?.user) return;

    (async () => {
      setLoading(true);
      const p = await fetchPostCore(id);
      setPost(p);
      await loadSocial();
      setLoading(false);
    })();
  }, [id, loadSocial, web.ready, whoami.data?.user]);

  const handleLikeToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);

    const nextMode = social.viewerHasLiked ? "unlike" : "like";
    await toggleLike(id, nextMode);

    // aggiorna UI locale
    setSocial((prev) => ({
      ...prev,
      viewerHasLiked: !prev.viewerHasLiked,
      likeCount: prev.viewerHasLiked
        ? Math.max(0, prev.likeCount - 1)
        : prev.likeCount + 1,
    }));

    // 🔥 NOTIFICA FEED
    emit("feed:refresh");

    setIsToggling(false);
  };

  if (loading || social.loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={{ padding: 24 }}>
        <Text>Post non trovato</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Pressable onPress={() => router.back()}>
        <Text>← Indietro</Text>
      </Pressable>

      <PostCard post={post} />

      <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 16, gap: 12 }}>
        <Text style={{ fontWeight: "800" }}>Reazioni</Text>

        <Text>👍 {social.likeCount}</Text>
        <Text>💬 {social.commentCount}</Text>

        <Pressable
          onPress={handleLikeToggle}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
            backgroundColor: social.viewerHasLiked ? "#111827" : "#e5e7eb",
          }}
        >
          <Text style={{ color: social.viewerHasLiked ? "#fff" : "#111827" }}>
            {social.viewerHasLiked ? "Hai messo 👍" : "Metti 👍"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
