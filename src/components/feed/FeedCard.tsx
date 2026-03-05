import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { getAuthorName, getPostText, type FeedPost } from "../../lib/feed/getFeedPosts";
import { isCertifiedClub } from "../../lib/profiles/certification";
import { isUuid } from "../../lib/api";
import FeedVideoPreview from "../../../components/feed/FeedVideoPreview";
import LightboxModal from "../../../components/media/LightboxModal";
import { sharePostById } from "../../lib/sharePost";
import { togglePostLike } from "../../lib/posts/togglePostLike";
import { supabase } from "../../lib/supabase";
import { devWarn } from "../../lib/debug/devLog";
import { theme } from "../../theme";

function formatWhen(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

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
          backgroundColor: theme.colors.neutral200,
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
        backgroundColor: theme.colors.neutral200,
      }}
    />
  );
}

export default function FeedCard({ item, onToast }: { item: FeedPost; onToast?: (message: string) => void }) {
  const router = useRouter();
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  const authorName = getAuthorName(item.author);
  const text = getPostText(item.raw);
  const when = formatWhen(item.created_at);
  const firstMedia = item.media?.[0] ?? null;
  const likeCount = typeof item.likeCount === "number" ? item.likeCount : 0;
  const [likes, setLikes] = useState(likeCount);
  const commentCount = typeof item.commentCount === "number" ? item.commentCount : 0;

  const post = (item?.raw as any) ?? (item as any);
  const authorIdRaw = post?.author_profile?.id ?? post?.author_profile_id ?? post?.authorId ?? post?.author_id ?? null;

  const authorUuid =
    (typeof post?.author_profile?.id_uuid === "string" ? post.author_profile.id_uuid : null) ??
    (typeof (post as any)?.author_profile_id_uuid === "string" ? (post as any).author_profile_id_uuid : null) ??
    authorIdRaw;

  const authorRoleRaw = (post as any)?.author_role ?? (post as any)?.authorRole ?? null;
  const authorRole = typeof authorRoleRaw === "string" ? authorRoleRaw.toLowerCase().trim() : null;
  const isAuthorClub = authorRole === "club";

  const postPath = resolvePostPath(item.id);

  const onLikePress = async () => {
    try {
      await togglePostLike({ postId: item.id, supabase });

      setLikes((v) => v + 1);

      if (onToast) {
        onToast("Like updated");
      }
    } catch (error) {
      console.warn("togglePostLike failed", error);
    }
  };

  const onCommentPress = () => {
    router.push(`/posts/${item.id}`);
  };

  const handleShare = async () => {
    try {
      await sharePostById(item.id, onToast);
    } catch (error) {
      devWarn("sharePostById failed", error);
      onToast?.("Condivisione non disponibile");
    }
  };

  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.neutral200,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: theme.colors.background,
        gap: 10,
      }}
    >
      <Pressable
        onPress={() => {
          console.log("[PR-MOB.PROFILES.2.1][tap-author]", {
            authorIdRaw,
            authorUuid,
            isUuid: authorUuid ? isUuid(authorUuid) : false,
            postKeys: Object.keys(post ?? {}),
          });

          if (!authorUuid || !isUuid(authorUuid)) {
            console.log("[PR-MOB.PROFILES.2.1][tap-author][skip]", "missing valid uuid");
            return;
          }

          const target =
            authorRole === null ? `/profiles/${authorUuid}` : isAuthorClub ? `/clubs/${authorUuid}` : `/players/${authorUuid}`;
          console.log("[PR-MOB.PROFILES.2.2][tap-author][target]", { authorUuid, authorRole, target });
          router.push(target);
        }}
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          opacity: authorUuid && isUuid(authorUuid) ? 1 : 0.6,
        }}
      >
        <Avatar url={item.author?.avatar_url ?? null} size={40} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: theme.colors.text }}>
              {authorName}
            </Text>
            {item.author && isCertifiedClub(item.author) ? (
              <Text style={{ fontSize: 11, fontWeight: "900", color: theme.colors.text }}>
                C
              </Text>
            ) : null}
          </View>
          <Text style={{ ...theme.typography.small, color: theme.colors.muted }}>{when}</Text>
        </View>
      </Pressable>

      <View style={{ gap: 10 }}>
        {!!text ? (
          <Pressable
            disabled={!postPath}
            onPress={() => {
              if (!postPath) return;
              router.push(postPath);
            }}
          >
            <Text style={{ fontSize: 14, lineHeight: 19, color: theme.colors.text }}>{text}</Text>
          </Pressable>
        ) : null}

        {firstMedia?.url ? (
          <Pressable
            onPress={() => {
              setLightbox({ open: true, index: 0 });
            }}
            style={{
              borderRadius: theme.radius.md,
              overflow: "hidden",
              backgroundColor: theme.colors.neutral100,
            }}
          >
            {firstMedia.media_type === "video" ? (
              <FeedVideoPreview
                uri={firstMedia.url}
                posterUri={firstMedia.poster_url || (firstMedia as any).posterUrl}
              />
            ) : (
              <Image
                source={{ uri: firstMedia.poster_url || firstMedia.url }}
                style={{ width: "100%", aspectRatio: 4 / 5 }}
                resizeMode="cover"
              />
            )}
            <View style={{ padding: 10 }}>
              <Text style={{ ...theme.typography.small, color: theme.colors.muted }}>
                {firstMedia.media_type === "video" ? "🎬 Video" : "🖼️ Foto"}
                {item.media.length > 1 ? ` • +${item.media.length - 1}` : ""}
              </Text>
            </View>
          </Pressable>
        ) : null}
      </View>

      <LightboxModal
        visible={lightbox.open}
        items={item.media ?? []}
        initialIndex={lightbox.index}
        onClose={() => setLightbox({ open: false, index: 0 })}
      />

      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        <Pressable onPress={onLikePress}>
          <Text style={{ ...theme.typography.small, color: theme.colors.muted }}>👍 {likes}</Text>
        </Pressable>
        <Pressable onPress={onCommentPress}>
          <Text style={{ ...theme.typography.small, color: theme.colors.muted }}>💬 {commentCount}</Text>
        </Pressable>
        <Pressable onPress={handleShare}>
          <Text style={{ ...theme.typography.smallStrong, color: theme.colors.primary }}>Condividi</Text>
        </Pressable>
      </View>
    </View>
  );
}

export { Avatar };
