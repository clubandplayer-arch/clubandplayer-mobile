import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FeedVideoPreview from "../../components/feed/FeedVideoPreview";
import LightboxModal from "../../components/media/LightboxModal";
import { supabase } from "../../src/lib/supabase";
import {
  fetchCommentCountsForIds,
  fetchReactionsForIds,
  setPostReaction,
  useWebSession,
  useWhoami,
} from "../../src/lib/api";
import { CommentsSection } from "../../src/components/CommentsSection";
import { getPostText, type FeedAuthor } from "../../src/lib/feed/getFeedPosts";
import { emit } from "../../src/lib/events/appEvents";
import { sharePostById } from "../../src/lib/sharePost";
import { devWarn } from "../../src/lib/debug/devLog";
import { theme } from "../../src/theme";
import { getProfileDisplayName } from "../../src/lib/profiles/getProfileDisplayName";
import { isCertifiedClub } from "../../src/lib/profiles/certification";

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

function Avatar({ url, size = 44, name, isCertified = false }: { url?: string | null; size?: number; name?: string; isCertified?: boolean }) {
  if (!url) {
    const initial = name?.trim().charAt(0).toUpperCase() || "U";
    return (
      <View style={{ position: "relative" }}>
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
        {isCertified ? (
          <Text style={{ position: "absolute", top: -11, right: -10, fontSize: 14, fontWeight: "900", color: theme.colors.primary, fontFamily: "Righteous_400Regular" }}>
            C
          </Text>
        ) : null}
      </View>
    );
  }
  return (
    <View style={{ position: "relative" }}>
      <Image
        source={{ uri: url }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.neutral200,
        }}
      />
      {isCertified ? (
        <Text style={{ position: "absolute", top: -11, right: -10, fontSize: 14, fontWeight: "900", color: theme.colors.primary, fontFamily: "Righteous_400Regular" }}>
          C
        </Text>
      ) : null}
    </View>
  );
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
    user_id: asString((data as any).user_id) ?? null,
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
  const certifiedClub = isCertifiedClub(post.author ?? null);

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
        <Avatar url={post.author?.avatar_url ?? null} size={44} name={authorName} isCertified={certifiedClub} />
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
    loading: true,
    error: null,
  });

  const [isToggling, setIsToggling] = useState(false);
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

      const likeCount =
        (rRes.data?.counts ?? []).find((x) => x.post_id === targetPostId && x.reaction === "like")?.count ?? 0;

      const viewerHasLiked =
        (rRes.data?.mine ?? []).some((m) => m.post_id === targetPostId && m.reaction === "like");

      const commentCount =
        (cRes.data?.counts ?? []).find((x) => x.post_id === targetPostId)?.count ?? 0;

      setSocial({
        likeCount,
        commentCount,
        viewerHasLiked,
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

  const handleLikeToggle = async () => {
    if (!postId || isToggling) return;
    setIsToggling(true);
    setSocial((prev) => ({ ...prev, error: null }));

    const nextHasLiked = !social.viewerHasLiked;

    try {
      // ✅ WEB parity: unlike = reaction null
      const res = await setPostReaction(postId, nextHasLiked ? "like" : null);
      if (!res.ok) throw new Error(res.errorText ?? `Toggle HTTP ${res.status}`);

      const likeCount =
        (res.data?.counts ?? []).find((x) => x.post_id === postId && x.reaction === "like")?.count ?? 0;

      const viewerHasLiked = res.data?.mine === "like";

      setSocial((prev) => ({
        ...prev,
        likeCount,
        viewerHasLiked,
      }));

      emit("feed:refresh");
    } catch (e: any) {
      setSocial((prev) => ({
        ...prev,
        error: e?.message ? String(e.message) : "Errore nel like",
      }));
    } finally {
      setIsToggling(false);
      await loadSocial(postId);
    }
  };

  const handleShare = async () => {
    if (!postId) return;
    try {
      await sharePostById(postId, setFlash);
    } catch (error: any) {
      devWarn("sharePostById failed", error);
      setFlash(error?.message ? String(error.message) : "Condivisione non disponibile");
    }
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
        <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>← Indietro</Text>
        </Pressable>

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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Text style={{ color: theme.colors.text }}>👍 {social.likeCount}</Text>
              <Text style={{ color: theme.colors.text }}>💬 {social.commentCount}</Text>
            </View>
          )}

          {social.error ? <Text style={{ color: theme.colors.danger }}>{social.error}</Text> : null}

          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Pressable
              onPress={handleLikeToggle}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: social.viewerHasLiked ? theme.colors.text : theme.colors.neutral200,
                backgroundColor: social.viewerHasLiked ? theme.colors.text : "transparent",
                alignSelf: "flex-start",
                opacity: isToggling ? 0.6 : 1,
              }}
            >
              <Text style={{ color: social.viewerHasLiked ? theme.colors.background : theme.colors.text, fontWeight: "700" }}>
                {social.viewerHasLiked ? "Hai messo 👍" : "Metti 👍"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleShare}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Condividi</Text>
            </Pressable>
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
    </KeyboardAvoidingView>
  );
}
