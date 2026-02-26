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
  Alert,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { getPostText, type FeedAuthor, type FeedMediaItem } from "../../src/lib/feed/getFeedPosts";
import { asString, normalizeMediaRow } from "../../src/lib/media/normalizeMedia";
import { resolveProfileByAuthorId } from "../../src/lib/profiles/resolveProfile";
import { getPostSocial, type PostSocialResult } from "../../src/lib/posts/getPostSocial";
import { createPostComment } from "../../src/lib/posts/createPostComment";
import { togglePostLike } from "../../src/lib/posts/togglePostLike";
import { isCertifiedClub } from "../../src/lib/profiles/certification";
import { fetchClubVerificationMap } from "../../src/lib/profiles/verification";
import { theme } from "../../src/theme";

type PostRow = {
  id: string;
  author_id?: string | null;
  created_at?: string | null;
  [k: string]: any;
};

function getSafeAuthorName(author: any): string {
  const name = author?.display_name || author?.full_name || author?.public_name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return "Utente";
}

function formatWhen(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

function Avatar({ url, size = 44, name }: { url?: string | null; size?: number; name?: string }) {
  if (!url) {
    const initial = name?.trim().charAt(0).toUpperCase() || "U";
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.neutral200,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: Math.max(12, Math.floor(size * 0.35)), fontWeight: "700", color: theme.colors.text }}>
          {initial}
        </Text>
      </View>
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
    viewerHasLiked: false,
  });
  const [isLiking, setIsLiking] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [viewerAuthor, setViewerAuthor] = useState<FeedAuthor | null>(null);

  const when = useMemo(() => formatWhen(post?.created_at ?? null), [post?.created_at]);
  const text = useMemo(() => (post ? getPostText(post as any) : ""), [post]);
  const authorName = useMemo(() => getSafeAuthorName(author), [author]);

  const load = useCallback(async () => {
    setError(null);

    if (!postId) {
      setError("Post non valido.");
      setPost(null);
      setAuthor(null);
      setMedia([]);
      setSocial({ likeCount: 0, commentCount: 0, comments: [], viewerHasLiked: false });
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
        setSocial({ likeCount: 0, commentCount: 0, comments: [], viewerHasLiked: false });
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
      const verifiedMap = resolved?.id ? await fetchClubVerificationMap(supabase, [resolved.id]) : new Map();
      const isVerified = resolved?.id ? verifiedMap.get(resolved.id) ?? false : false;
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
              verified_until: resolved.verified_until,
              certified: resolved.certified,
              certification_status: resolved.certification_status,
              is_verified: isVerified,
            }
          : null,
      );
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Errore nel caricamento post");
      setPost(null);
      setAuthor(null);
      setMedia([]);
      setSocial({ likeCount: 0, commentCount: 0, comments: [], viewerHasLiked: false });
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

  const ensureViewer = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const currentViewerUserId = user?.id ? String(user.id) : null;
    setViewerUserId(currentViewerUserId);

    if (!currentViewerUserId) return { viewerId: null, viewerFeedAuthor: null as FeedAuthor | null };

    if (viewerAuthor && viewerUserId === currentViewerUserId) {
      return { viewerId: currentViewerUserId, viewerFeedAuthor: viewerAuthor };
    }

    const profile = await resolveProfileByAuthorId(currentViewerUserId, supabase);
    const verifiedMap = profile?.id ? await fetchClubVerificationMap(supabase, [profile.id]) : new Map();
    const isVerified = profile?.id ? verifiedMap.get(profile.id) ?? false : false;
    const mappedAuthor: FeedAuthor | null = profile
      ? {
          id: profile.id,
          user_id: profile.user_id ?? undefined,
          full_name: profile.full_name,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          type: profile.type,
          account_type: profile.account_type,
          role: profile.role,
          verified_until: profile.verified_until,
          certified: profile.certified,
          certification_status: profile.certification_status,
          is_verified: isVerified,
        }
      : null;

    setViewerAuthor(mappedAuthor);
    return { viewerId: currentViewerUserId, viewerFeedAuthor: mappedAuthor };
  }, [viewerAuthor, viewerUserId]);

  const onSubmitComment = useCallback(async () => {
    if (!postId || isSubmittingComment) return;

    const trimmedDraft = commentDraft.trim();
    if (!trimmedDraft) return;

    let optimisticId: string | null = null;

    try {
      setIsSubmittingComment(true);

      const { viewerId, viewerFeedAuthor } = await ensureViewer();
      if (!viewerId) {
        Alert.alert("Accedi per commentare");
        router.push("/(auth)/login");
        return;
      }

      optimisticId = `optimistic-${Date.now()}`;
      const optimisticCreatedAt = new Date().toISOString();
      setCommentDraft("");
      setSocial((prev) => ({
        ...prev,
        commentCount: (prev.commentCount ?? 0) + 1,
        comments: [
          {
            id: optimisticId as string,
            post_id: postId,
            author_id: viewerId,
            created_at: optimisticCreatedAt,
            content: trimmedDraft,
            author: viewerFeedAuthor,
          },
          ...prev.comments,
        ],
      }));

      await createPostComment({ postId, content: trimmedDraft, supabase });

      const refreshedSocial = await getPostSocial(postId, supabase);
      setSocial((prev) => ({
        ...prev,
        ...refreshedSocial,
      }));
    } catch (e: any) {
      if (optimisticId) {
        setSocial((prev) => ({
          ...prev,
          commentCount: Math.max(0, (prev.commentCount ?? 0) - 1),
          comments: prev.comments.filter((comment) => comment.id !== optimisticId),
        }));
      }
      Alert.alert("Commenti", e?.message ? String(e.message) : "Impossibile pubblicare il commento");
    } finally {
      setIsSubmittingComment(false);
    }
  }, [commentDraft, ensureViewer, isSubmittingComment, postId, router]);

  const onToggleLike = useCallback(async () => {
    if (!postId || isLiking) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      Alert.alert("Accedi per mettere like");
      return;
    }

    try {
      setIsLiking(true);
      const result = await togglePostLike({ postId, supabase });
      setSocial((prev) => ({
        ...prev,
        viewerHasLiked: result.liked,
        likeCount: Math.max(0, (prev.likeCount ?? 0) + result.likeCountDelta),
      }));

      const refreshedSocial = await getPostSocial(postId, supabase);
      setSocial((prev) => ({
        ...prev,
        ...refreshedSocial,
      }));
    } catch (e: any) {
      Alert.alert("Like", e?.message ? String(e.message) : "Operazione non riuscita");
    } finally {
      setIsLiking(false);
    }
  }, [isLiking, postId]);

  const screenW = Dimensions.get("window").width;
  const mediaW = screenW - 48; // padding 24*2
  const mediaH = 260;
  const likeCount = social.likeCount ?? 0;
  const commentCount = social.commentCount ?? 0;
  const liked = Boolean(social.viewerHasLiked);
  const isCommentSubmitDisabled = isSubmittingComment || !commentDraft.trim();

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
            borderColor: theme.colors.neutral200,
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
            borderColor: theme.colors.dangerBorder,
            backgroundColor: theme.colors.dangerBg,
            borderRadius: 12,
            padding: 14,
            gap: 8,
          }}
        >
          <Text style={{ fontWeight: "900", color: theme.colors.danger }}>Errore</Text>
          <Text style={{ color: theme.colors.danger }}>{error}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              load();
            }}
            style={{ alignSelf: "flex-start" }}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: "900" }}>Riprova</Text>
          </Pressable>
        </View>
      ) : null}

      {!error && post ? (
        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16, gap: 12 }}>
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 16, fontWeight: "900" }}>{authorName}</Text>
                {author && isCertifiedClub(author) ? (
                  <Text style={{ fontSize: 12, fontWeight: "900", color: theme.colors.text }}>C</Text>
                ) : null}
              </View>
              <Text style={{ fontSize: 12, color: theme.colors.muted }}>{when}</Text>
            </View>
          </Pressable>

          {/* Text */}
          {text ? (
            <Text style={{ fontSize: 14, lineHeight: 19, color: theme.colors.text }}>{text}</Text>
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
                    backgroundColor: theme.colors.neutral100,
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
                      backgroundColor: theme.colors.muted,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ color: theme.colors.background, fontWeight: "800", fontSize: 12 }}>
                      {m.media_type === "video" ? "🎬 Video" : "🖼️ Foto"}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
            <Pressable onPress={onToggleLike} disabled={isLiking} hitSlop={8}>
              <Text style={{ fontSize: 12, color: liked ? theme.colors.primary : theme.colors.muted, fontWeight: liked ? "800" : "500" }}>
                👍 {likeCount}{liked ? " · Mi piace" : ""}
              </Text>
            </Pressable>
            {isLiking ? <ActivityIndicator size="small" color={theme.colors.muted} /> : null}
            <Text style={{ fontSize: 12, color: theme.colors.muted }}>💬 {commentCount}</Text>
          </View>
        </View>
      ) : null}

      {!error && post ? (
        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "800" }}>Commenti</Text>

          <View style={{ gap: 10 }}>
            <TextInput
              value={commentDraft}
              onChangeText={setCommentDraft}
              placeholder="Scrivi un commento…"
              multiline
              editable={!isSubmittingComment}
              maxLength={2000}
              textAlignVertical="top"
              style={{
                minHeight: 88,
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: theme.colors.text,
                backgroundColor: isSubmittingComment ? theme.colors.neutral50 : theme.colors.background,
              }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: theme.colors.muted }}>{commentDraft.trim().length}/2000</Text>
              <Pressable
                onPress={onSubmitComment}
                disabled={isCommentSubmitDisabled}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                  backgroundColor: isCommentSubmitDisabled ? theme.colors.neutral200 : theme.colors.primary,
                }}
              >
                <Text style={{ color: theme.colors.background, fontWeight: "800" }}>
                  {isSubmittingComment ? "Pubblicazione..." : "Pubblica"}
                </Text>
              </Pressable>
            </View>
          </View>

          {social.comments.length > 0 ? (
            <View style={{ gap: 12 }}>
              {social.comments.map((comment) => {
                const commentAuthorName = getSafeAuthorName(comment.author);
                const commentWhen = formatWhen(comment.created_at);
                return (
                  <View
                    key={comment.id}
                    style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}
                  >
                    <Avatar url={comment.author?.avatar_url ?? null} size={36} name={commentAuthorName} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700" }}>{commentAuthorName}</Text>
                          {comment.author && isCertifiedClub(comment.author) ? (
                            <Text style={{ fontSize: 11, fontWeight: "900", color: theme.colors.text }}>C</Text>
                          ) : null}
                        </View>
                        <Text style={{ fontSize: 11, color: theme.colors.muted }}>{commentWhen}</Text>
                      </View>
                      <Text style={{ fontSize: 13, lineHeight: 18, color: theme.colors.text }}>
                        {comment.content}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: theme.colors.muted }}>Nessun commento ancora.</Text>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}
