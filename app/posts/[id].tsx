import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FeedVideoPreview from "../../components/feed/FeedVideoPreview";
import LightboxModal from "../../components/media/LightboxModal";
import { supabase } from "../../src/lib/supabase";
import {
  fetchCommentCountsForIds,
  deleteFeedPost,
  fetchReactionsForIds,
  setPostReaction,
  updateFeedPost,
  useWebSession,
  useWhoami,
} from "../../src/lib/api";
import { CommentsSection } from "../../src/components/CommentsSection";
import {
  FEED_REACTION_TYPES,
  getPostText,
  isFeedReactionType,
  type FeedAuthor,
  type FeedReactionType,
} from "../../src/lib/feed/getFeedPosts";
import { emit } from "../../src/lib/events/appEvents";
import { sharePostById } from "../../src/lib/sharePost";
import { devWarn } from "../../src/lib/debug/devLog";
import { theme } from "../../src/theme";
import { getProfileDisplayName } from "../../src/lib/profiles/getProfileDisplayName";
import { resolveProfileByAuthorId } from "../../src/lib/profiles/resolveProfile";
import ProfileAvatar from "../../src/components/profiles/ProfileAvatar";
import { isPostOwner, normalizePostContent } from "../../src/lib/feed/postOwnership";

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
  viewerReaction: FeedReactionType | null;
  reactionCounts: Record<FeedReactionType, number>;
  loading: boolean;
  error: string | null;
};

const REACTION_META: Record<FeedReactionType, { emoji: string; label: string }> = {
  like: { emoji: "👍", label: "Mi piace" },
  love: { emoji: "❤️", label: "Love" },
  care: { emoji: "🔥", label: "Care" },
  angry: { emoji: "😡", label: "Angry" },
};

function emptyReactionCounts(): Record<FeedReactionType, number> {
  return { like: 0, love: 0, care: 0, angry: 0 };
}

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
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

function getSafeAuthorName(author: any): string {
  return getProfileDisplayName(author ?? null);
}

function getWhoamiUserId(user: unknown): string | null {
  if (!user || typeof user !== "object") return null;

  const candidate = (user as any).id ?? (user as any).user_id ?? null;
  if (typeof candidate !== "string") return null;

  const trimmed = candidate.trim();
  return trimmed ? trimmed : null;
}

async function fetchAuthorProfile(authorId: string | null): Promise<FeedAuthor | null> {
  if (!authorId) return null;
  const data = await resolveProfileByAuthorId(authorId, supabase);
  if (!data) return null;

  return {
    id: data.id ?? undefined,
    user_id: data.user_id ?? null,
    full_name: data.full_name,
    display_name: data.display_name,
    avatar_url: data.avatar_url,
    account_type: data.account_type,
    type: data.type,
    role: data.role,
    certified: data.certified,
    certification_status: data.certification_status,
    verified_until: data.verified_until,
    is_verified: data.is_verified,
  };
}

async function fetchPostCore(postId: string): Promise<PostDetail | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_FIELDS)
    .eq("id", postId)
    .maybeSingle();

  if (error || !data) return null;

  const author = await fetchAuthorProfile(asString((data as any).author_id));

  return {
    id: asString((data as any).id) ?? postId,
    author_id: asString((data as any).author_id),
    created_at: asString((data as any).created_at),
    quoted_post_id: asString((data as any).quoted_post_id),
    raw: data as any,
    author,
  };
}

function PostCard({ post, title }: { post: PostDetail; title?: string }) {
  const [videoLightboxOpen, setVideoLightboxOpen] = useState(false);
  const authorName = getSafeAuthorName(post.author);
  const when = formatWhen(post.created_at);
  const text = getPostText(post.raw);
  const mediaUrl = asString((post.raw as any)?.media_url);
  const mediaType = asString((post.raw as any)?.media_type);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.neutral200,
        borderRadius: 16,
        padding: 16,
        gap: 12,
        backgroundColor: theme.colors.background,
      }}
    >
      {title ? (
        <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.muted }}>
          {title}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <ProfileAvatar
          uri={post.author?.avatar_url ?? null}
          size={44}
          name={authorName}
          profile={{
            accountType: post.author?.account_type ?? post.author?.type ?? post.author?.role ?? null,
            is_verified: post.author?.is_verified ?? null,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: theme.colors.text }}>
            {authorName}
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.muted }}>{when}</Text>
        </View>
      </View>

      {text ? (
        <Text style={{ fontSize: 15, lineHeight: 20, color: theme.colors.text }}>
          {text}
        </Text>
      ) : null}

      {mediaUrl ? (
        <View style={{ borderRadius: 14, overflow: "hidden", backgroundColor: theme.colors.neutral100 }}>
          {mediaType === "video" ? (
            <Pressable
              onPress={() => setVideoLightboxOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Apri video in fullscreen"
            >
              <FeedVideoPreview uri={mediaUrl} />
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                pointerEvents="none"
              >
                <View
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: 999,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 28, marginLeft: 2 }}>▶</Text>
                </View>
              </View>
            </Pressable>
          ) : (
            <Image
              source={{ uri: mediaUrl }}
              style={{ width: "100%", height: 240 }}
              resizeMode="cover"
            />
          )}
          <View style={{ padding: 10 }}>
            <Text style={{ fontSize: 12, color: theme.colors.muted }}>
              {mediaType === "video" ? "Tocca per aprire il video" : "Media"}
            </Text>
          </View>
        </View>
      ) : null}

      {mediaType === "video" && mediaUrl ? (
        <LightboxModal
          visible={videoLightboxOpen}
          items={[{ url: mediaUrl, media_type: "video" }]}
          initialIndex={0}
          onClose={() => setVideoLightboxOpen(false)}
        />
      ) : null}
    </View>
  );
}

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const postId = useMemo(() => {
    if (!params.id) return null;
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params.id]);

  const web = useWebSession();
  const whoami = useWhoami(web.ready);
  const currentUserId = getWhoamiUserId(whoami.data?.user);

  const [post, setPost] = useState<PostDetail | null>(null);
  const [quotedPost, setQuotedPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [social, setSocial] = useState<SocialState>({
    likeCount: 0,
    commentCount: 0,
    viewerHasLiked: false,
    viewerReaction: null,
    reactionCounts: emptyReactionCounts(),
    loading: true,
    error: null,
  });

  const [isToggling, setIsToggling] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [editingOpen, setEditingOpen] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);

  const loadSocial = useCallback(async (targetPostId: string) => {
    setSocial((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [rRes, cRes] = await Promise.all([
        fetchReactionsForIds([targetPostId]),
        fetchCommentCountsForIds([targetPostId]),
      ]);

      if (!rRes.ok) throw new Error(rRes.errorText ?? `Reactions HTTP ${rRes.status}`);
      if (!cRes.ok) throw new Error(cRes.errorText ?? `Comments HTTP ${cRes.status}`);

      const reactionCounts = emptyReactionCounts();
      for (const row of rRes.data?.counts ?? []) {
        if (!row?.post_id || row.post_id !== targetPostId) continue;
        if (!isFeedReactionType(row.reaction)) continue;
        reactionCounts[row.reaction] = Number(row.count) || 0;
      }
      const likeCount = reactionCounts.like ?? 0;
      const mineReaction = (rRes.data?.mine ?? []).find((m) => m.post_id === targetPostId)?.reaction ?? null;
      const viewerReaction = isFeedReactionType(mineReaction) ? mineReaction : null;
      const viewerHasLiked = viewerReaction === "like";

      const commentCount =
        (cRes.data?.counts ?? []).find((x) => x.post_id === targetPostId)?.count ?? 0;

      setSocial({
        likeCount,
        commentCount,
        viewerHasLiked,
        viewerReaction,
        reactionCounts,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      setSocial((prev) => ({
        ...prev,
        loading: false,
        error: e?.message ? String(e.message) : "Errore nel social",
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
    } catch (e: any) {
      setPost(null);
      setQuotedPost(null);
      setError(e?.message ? String(e.message) : "Errore nel caricamento post");
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

  const handleReactionToggle = async (nextReaction: FeedReactionType | null) => {
    if (!postId || isToggling) return;
    setIsToggling(true);
    setSocial((prev) => ({ ...prev, error: null }));
    const prevReaction = social.viewerReaction;
    const prevCounts = { ...social.reactionCounts };

    try {
      const res = await setPostReaction(postId, nextReaction as any);
      if (!res.ok) throw new Error(res.errorText ?? `Toggle HTTP ${res.status}`);

      const reactionCounts = emptyReactionCounts();
      for (const row of res.data?.counts ?? []) {
        if (!row?.post_id || row.post_id !== postId) continue;
        if (!isFeedReactionType(row.reaction)) continue;
        reactionCounts[row.reaction] = Number(row.count) || 0;
      }
      const likeCount = reactionCounts.like ?? 0;
      const viewerReaction = isFeedReactionType(res.data?.mine) ? res.data.mine : null;
      const viewerHasLiked = viewerReaction === "like";

      setSocial((prev) => ({
        ...prev,
        likeCount,
        viewerHasLiked,
        viewerReaction,
        reactionCounts,
      }));

      emit("feed:refresh");
    } catch (e: any) {
      setSocial((prev) => ({
        ...prev,
        viewerReaction: prevReaction,
        reactionCounts: prevCounts,
        error: e?.message ? String(e.message) : "Errore nel like",
      }));
    } finally {
      setIsToggling(false);
      await loadSocial(postId);
    }
  };

  const handleLikeToggle = async () => {
    const nextReaction = social.viewerReaction === "like" ? null : "like";
    await handleReactionToggle(nextReaction);
  };

  const handleShare = async () => {
    if (!postId) return;
    try {
      setShareLoading(true);
      await sharePostById(postId, setFlash);
    } catch (error: any) {
      devWarn("sharePostById failed", error);
      setFlash(error?.message ? String(error.message) : "Condivisione non disponibile");
    } finally {
      setShareLoading(false);
    }
  };

  const canManagePost = isPostOwner({ authorId: post?.author_id ?? null }, currentUserId);

  const handleOpenEdit = () => {
    if (!canManagePost || savingPost || !post) return;
    setEditDraft(getPostText(post.raw));
    setEditingOpen(true);
  };

  const handleSubmitEdit = async () => {
    if (!postId || !post || !canManagePost || savingPost) return;
    const content = normalizePostContent(editDraft);
    if (!content) {
      setFlash("Il contenuto non può essere vuoto");
      return;
    }

    try {
      setSavingPost(true);
      const response = await updateFeedPost(postId, content);
      if (!response.ok) throw new Error(response.errorText ?? `PATCH HTTP ${response.status}`);
      setPost((prev) => (prev ? { ...prev, raw: { ...prev.raw, content } } : prev));
      setEditingOpen(false);
      setFlash("Post aggiornato");
      emit("feed:refresh");
    } catch (error: any) {
      setFlash(error?.message ? String(error.message) : "Errore aggiornando il post");
    } finally {
      setSavingPost(false);
    }
  };

  const handleDeletePost = () => {
    if (!postId || !canManagePost || savingPost) return;
    Alert.alert("Elimina post", "Vuoi eliminare questo post?", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina",
        style: "destructive",
        onPress: async () => {
          try {
            setSavingPost(true);
            const response = await deleteFeedPost(postId);
            if (!response.ok) throw new Error(response.errorText ?? `DELETE HTTP ${response.status}`);
            emit("feed:refresh");
            setFlash("Post eliminato");
            router.replace("/(tabs)/feed");
          } catch (error: any) {
            setFlash(error?.message ? String(error.message) : "Errore eliminando il post");
          } finally {
            setSavingPost(false);
          }
        },
      },
    ]);
  };

  const handleCommentCountChange = (nextCount: number) => {
    setSocial((prev) => ({ ...prev, commentCount: Math.max(0, nextCount) }));
    emit("feed:refresh");
  };


  const scrollComposerIntoView = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    const onKeyboardDidShow = (event: { endCoordinates?: { height?: number } }) => {
      const nextHeight = event?.endCoordinates?.height;
      setKeyboardHeight(typeof nextHeight === "number" && Number.isFinite(nextHeight) ? nextHeight : 0);
      if (!isComposerFocused) return;
      scrollComposerIntoView(true);
    };

    const onKeyboardDidHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener("keyboardDidShow", onKeyboardDidShow);
    const hideSub = Keyboard.addListener("keyboardDidHide", onKeyboardDidHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isComposerFocused, scrollComposerIntoView]);

  if (web.loading || whoami.loading || loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }}>
        <ActivityIndicator />
        <Text style={{ color: theme.colors.muted }}>Caricamento dettaglio…</Text>
      </View>
    );
  }

  if (web.error) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Sessione web</Text>
        <Text style={{ color: theme.colors.danger }}>Sessione web non disponibile.</Text>
        <Pressable
          onPress={handleRetry}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.text,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (!whoami.data?.user) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 16, justifyContent: "center" }}>
        <Text style={{ fontSize: 20, fontWeight: "800" }}>Login richiesto</Text>
        <Text style={{ color: theme.colors.text }}>
          Per vedere il dettaglio del post devi effettuare l'accesso.
        </Text>
        <Pressable
          onPress={() => router.replace("/(auth)/login")}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            backgroundColor: theme.colors.text,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ color: theme.colors.background, fontWeight: "700" }}>Vai al login</Text>
        </Pressable>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Errore</Text>
        <Text style={{ color: theme.colors.danger }}>{error}</Text>
        <Pressable
          onPress={handleRetry}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.text,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Post non disponibile</Text>
        <Text style={{ color: theme.colors.muted }}>
          Questo post non esiste o non è accessibile.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.text,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>Indietro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding: 24, paddingBottom: Math.max(32, insets.bottom + 16), gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        <PostCard post={post} />
        {quotedPost ? <PostCard post={quotedPost} title="Post citato" /> : null}

        {flash ? (
          <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, backgroundColor: theme.colors.neutral50, borderRadius: 12, padding: 12 }}>
            <Text style={{ fontWeight: "700", color: theme.colors.text }}>{flash}</Text>
          </View>
        ) : null}

        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            borderRadius: 14,
            padding: 16,
            gap: 12,
            backgroundColor: theme.colors.neutral50,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "800" }}>Reazioni</Text>

          {social.loading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator size="small" />
              <Text style={{ color: theme.colors.muted }}>Caricamento reazioni…</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {FEED_REACTION_TYPES.map((reaction) => {
                const count = social.reactionCounts[reaction] ?? 0;
                if (count <= 0) return null;
                const meta = REACTION_META[reaction];
                return (
                  <Text key={reaction} style={{ color: theme.colors.text }}>
                    {meta.emoji} {count}
                  </Text>
                );
              })}
              <Text style={{ color: theme.colors.text }}>💬 {social.commentCount}</Text>
            </View>
          )}

          {social.error ? <Text style={{ color: theme.colors.danger }}>{social.error}</Text> : null}

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Pressable
                onPress={handleLikeToggle}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: social.viewerReaction ? theme.colors.text : theme.colors.neutral200,
                  backgroundColor: social.viewerReaction ? theme.colors.text : "transparent",
                  alignSelf: "flex-start",
                  opacity: isToggling ? 0.6 : 1,
                  minHeight: 40,
                }}
              >
                <Text style={{ color: social.viewerReaction ? theme.colors.background : theme.colors.text, fontWeight: "700" }}>
                  {social.viewerReaction ? `Hai messo ${REACTION_META[social.viewerReaction].emoji}` : "Metti 👍"}
                </Text>
              </Pressable>

              {canManagePost ? (
                <>
                  <Pressable
                    onPress={handleOpenEdit}
                    disabled={savingPost || shareLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Modifica questo post"
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: theme.colors.neutral200,
                      alignSelf: "flex-start",
                      minHeight: 40,
                      opacity: savingPost ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>✏️</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDeletePost}
                    disabled={savingPost || shareLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Elimina questo post"
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: theme.colors.neutral200,
                      alignSelf: "flex-start",
                      minHeight: 40,
                      opacity: savingPost ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>🗑️</Text>
                  </Pressable>
                </>
              ) : null}
              <Pressable
                onPress={handleShare}
                disabled={savingPost || shareLoading}
                accessibilityRole="button"
                accessibilityLabel="Condividi questo post"
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.colors.neutral200,
                  alignSelf: "flex-start",
                  minHeight: 40,
                  opacity: shareLoading ? 0.6 : 1,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>🔗</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {FEED_REACTION_TYPES.map((reaction) => {
                const meta = REACTION_META[reaction];
                const active = social.viewerReaction === reaction;
                return (
                  <Pressable
                    key={reaction}
                    onPress={() => void handleReactionToggle(active ? null : reaction)}
                    style={{
                      minWidth: 36,
                      minHeight: 36,
                      paddingHorizontal: 8,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: active ? theme.colors.text : theme.colors.neutral200,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? theme.colors.text : "transparent",
                      opacity: isToggling ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 17, color: active ? theme.colors.background : theme.colors.text }}>
                      {meta.emoji}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <CommentsSection
          postId={post.id}
          currentUserId={currentUserId}
          initialCount={social.commentCount}
          onCountChange={handleCommentCountChange}
          composerBottomSpacing={isComposerFocused && keyboardHeight > 0 ? 12 : 0}
          onComposerFocusChange={(focused) => {
            setIsComposerFocused(focused);
            if (!focused) return;
            scrollComposerIntoView(true);
            setTimeout(() => scrollComposerIntoView(true), 120);
          }}
        />
      </ScrollView>

      <Modal visible={editingOpen} animationType="slide" transparent onRequestClose={() => setEditingOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: theme.colors.background, borderRadius: 14, padding: 14, gap: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: theme.colors.text }}>Modifica post</Text>
            <TextInput
              value={editDraft}
              onChangeText={setEditDraft}
              editable={!savingPost}
              multiline
              maxLength={4000}
              style={{
                minHeight: 120,
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                borderRadius: 10,
                padding: 10,
                color: theme.colors.text,
                textAlignVertical: "top",
              }}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
              <Pressable onPress={() => setEditingOpen(false)} disabled={savingPost} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 10 }}>
                <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>Annulla</Text>
              </Pressable>
              <Pressable onPress={() => void handleSubmitEdit()} disabled={savingPost} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 10 }}>
                <Text style={{ color: theme.colors.primary, fontWeight: "800" }}>{savingPost ? "Salvataggio…" : "Salva"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
