import { useState } from "react";
import { Alert, Image, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import {
  FEED_REACTION_TYPES,
  getAuthorName,
  getFeedCountryCode,
  getPostText,
  isFeedReactionType,
  type FeedPost,
  type FeedReactionType,
} from "../../lib/feed/getFeedPosts";
import { isUuid } from "../../lib/api";
import FeedVideoPreview from "../../../components/feed/FeedVideoPreview";
import LightboxModal from "../../../components/media/LightboxModal";
import { sharePostById } from "../../lib/sharePost";
import { devWarn } from "../../lib/debug/devLog";
import { theme } from "../../theme";
import { deleteFeedPost, setPostReaction, updateFeedPost } from "../../lib/api";
import { iso2ToFlagEmoji } from "../../lib/geo/countryFlag";
import ProfileAvatar from "../profiles/ProfileAvatar";
import { isPostOwner, normalizePostContent } from "../../lib/feed/postOwnership";

const REACTION_META: Record<FeedReactionType, { emoji: string; label: string }> = {
  like: { emoji: "👍", label: "Mi piace" },
  love: { emoji: "❤️", label: "Love" },
  care: { emoji: "🔥", label: "Care" },
  angry: { emoji: "😡", label: "Angry" },
};

function cloneReactionCounts(input?: Partial<Record<FeedReactionType, number>>): Record<FeedReactionType, number> {
  return {
    like: Number(input?.like ?? 0),
    love: Number(input?.love ?? 0),
    care: Number(input?.care ?? 0),
    angry: Number(input?.angry ?? 0),
  };
}

function sumReactionCounts(counts: Partial<Record<FeedReactionType, number>>): number {
  return FEED_REACTION_TYPES.reduce((acc, type) => acc + (Number(counts[type] ?? 0) || 0), 0);
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

function resolvePostPath(postId: string | null | undefined): string | null {
  const id = (postId ?? "").toString().trim();
  if (!id) return null;
  return `/posts/${encodeURIComponent(id)}`;
}

function resolveAuthorRoute(args: {
  authorUuid: string;
  authorRole: string | null;
  author: FeedPost["author"];
}): string {
  const role = (args.authorRole ?? args.author?.account_type ?? args.author?.type ?? args.author?.role ?? "")
    .toString()
    .trim()
    .toLowerCase();

  if (role === "club" || role === "clubs" || role === "team") return `/clubs/${args.authorUuid}`;
  if (role === "athlete" || role === "player" || role === "players") return `/players/${args.authorUuid}`;

  return `/profile/${args.authorUuid}`;
}

export default function FeedCard({
  item,
  onToast,
  currentUserId,
  onPatchPost,
  onRemovePost,
}: {
  item: FeedPost;
  onToast?: (message: string) => void;
  currentUserId?: string | null;
  onPatchPost?: (postId: string, patch: Partial<Record<string, unknown>>) => void;
  onRemovePost?: (postId: string) => void;
}) {
  const router = useRouter();
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  const authorName = getAuthorName(item.author);
  const text = getPostText(item.raw);
  const when = formatWhen(item.created_at);
  const countryFlag = iso2ToFlagEmoji(getFeedCountryCode(item));
  const firstMedia = item.media?.[0] ?? null;
  const [reactionCounts, setReactionCounts] = useState<Record<FeedReactionType, number>>(
    cloneReactionCounts(item.reactionCounts),
  );
  const [viewerReaction, setViewerReaction] = useState<FeedReactionType | null>(item.viewerReaction ?? null);
  const [isLiking, setIsLiking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [editingOpen, setEditingOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(text);
  const [pickerOpen, setPickerOpen] = useState(false);
  const commentCount = typeof item.commentCount === "number" ? item.commentCount : 0;
  const totalReactions = sumReactionCounts(reactionCounts);
  const primaryReaction = viewerReaction ? REACTION_META[viewerReaction] : REACTION_META.like;

  const post = (item?.raw as any) ?? (item as any);
  const authorIdRaw = post?.author_profile?.id ?? post?.author_profile_id ?? post?.authorId ?? post?.author_id ?? null;

  const authorUuid =
    (typeof post?.author_profile?.id_uuid === "string" ? post.author_profile.id_uuid : null) ??
    (typeof (post as any)?.author_profile_id_uuid === "string" ? (post as any).author_profile_id_uuid : null) ??
    authorIdRaw;

  const authorRoleRaw = (post as any)?.author_role ?? (post as any)?.authorRole ?? null;
  const authorRole = typeof authorRoleRaw === "string" ? authorRoleRaw.toLowerCase().trim() : null;

  const postPath = resolvePostPath(item.id);
  const owner = isPostOwner({ authorId: authorIdRaw }, currentUserId);


  const applyOptimisticReaction = (
    currentCounts: Record<FeedReactionType, number>,
    previous: FeedReactionType | null,
    next: FeedReactionType | null,
  ) => {
    const patched = { ...currentCounts };
    if (previous && patched[previous] > 0) patched[previous] -= 1;
    if (next) patched[next] += 1;
    return patched;
  };

  const handleReactionToggle = async (nextReaction: FeedReactionType | null) => {
    if (!item.id) return;
    if (isLiking) return;
    const previousReaction = viewerReaction;
    const prevCounts = { ...reactionCounts };
    try {
      setIsLiking(true);
      setPickerOpen(false);
      setViewerReaction(nextReaction);
      setReactionCounts((prev) => applyOptimisticReaction(prev, previousReaction, nextReaction));

      const res = await setPostReaction(item.id, nextReaction as any);
      if (!res.ok) {
        throw new Error(res.errorText ?? `Toggle HTTP ${res.status}`);
      }

      const nextCounts: Record<FeedReactionType, number> = { like: 0, love: 0, care: 0, angry: 0 };
      for (const row of res.data?.counts ?? []) {
        if (!row?.post_id || row.post_id !== item.id) continue;
        if (!isFeedReactionType(row.reaction)) continue;
        nextCounts[row.reaction] = Number(row.count) || 0;
      }
      const confirmedReaction = isFeedReactionType(res.data?.mine) ? res.data.mine : null;

      setViewerReaction(confirmedReaction);
      setReactionCounts(nextCounts);
    } catch (error: any) {
      setViewerReaction(previousReaction);
      setReactionCounts(prevCounts);
      onToast?.(error?.message ? String(error.message) : "Like non disponibile");
    } finally {
      setIsLiking(false);
    }
  };

  const handleLikePress = async () => {
    const nextReaction = viewerReaction === "like" ? null : "like";
    await handleReactionToggle(nextReaction);
  };

  const handleOpenComments = () => {
    if (!postPath) return;
    router.push(postPath);
  };
  const handleShare = async () => {
    if (!item.id) return;
    try {
      setShareLoading(true);
      await sharePostById(item.id, onToast);
    } catch (error) {
      devWarn("sharePostById failed", error);
      onToast?.("Condivisione non disponibile");
    } finally {
      setShareLoading(false);
    }
  };

  const handleStartEdit = () => {
    if (!owner || saving) return;
    setEditDraft(text);
    setEditingOpen(true);
  };

  const handleSubmitEdit = async () => {
    if (!item.id || !owner || saving) return;
    const content = normalizePostContent(editDraft);
    if (!content) {
      onToast?.("Il contenuto non può essere vuoto");
      return;
    }

    try {
      setSaving(true);
      const response = await updateFeedPost(item.id, content);
      if (!response.ok) throw new Error(response.errorText ?? `PATCH HTTP ${response.status}`);
      onPatchPost?.(item.id, { content });
      setEditingOpen(false);
      onToast?.("Post aggiornato");
    } catch (error: any) {
      onToast?.(error?.message ? String(error.message) : "Errore aggiornando il post");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!item.id || !owner || saving) return;
    Alert.alert("Elimina post", "Vuoi eliminare questo post?", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            const response = await deleteFeedPost(item.id);
            if (!response.ok) throw new Error(response.errorText ?? `DELETE HTTP ${response.status}`);
            onRemovePost?.(item.id);
            onToast?.("Post eliminato");
          } catch (error: any) {
            onToast?.(error?.message ? String(error.message) : "Errore eliminando il post");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
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

          const target = resolveAuthorRoute({ authorUuid, authorRole, author: item.author ?? null });
          console.log("[PR-MOB.PROFILES.2.2][tap-author][target]", { authorUuid, authorRole, target });
          router.navigate(target);
        }}
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          opacity: authorUuid && isUuid(authorUuid) ? 1 : 0.6,
        }}
      >
        <ProfileAvatar
          uri={item.author?.avatar_url ?? null}
          size={40}
          name={authorName}
          profile={{
            accountType: item.author?.account_type ?? item.author?.type ?? item.author?.role ?? null,
            is_verified: item.author?.is_verified ?? null,
          }}
        />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: theme.colors.text }}>{authorName}</Text>
          </View>
          <Text style={{ ...theme.typography.small, color: theme.colors.muted }}>
            {countryFlag ? `${countryFlag} · ${when}` : when}
          </Text>
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

      <View style={{ flexDirection: "row", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <View style={{ position: "relative" }}>
          <Pressable
            onPress={handleLikePress}
            onLongPress={() => setPickerOpen((prev) => !prev)}
            disabled={isLiking}
            hitSlop={10}
            style={{
              minHeight: 40,
              minWidth: 120,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: viewerReaction ? theme.colors.primary : theme.colors.neutral200,
              backgroundColor: viewerReaction ? theme.colors.neutral50 : "transparent",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>{primaryReaction.emoji}</Text>
            <Text style={{ ...theme.typography.small, color: theme.colors.muted }}>{totalReactions}</Text>
          </Pressable>

          {pickerOpen ? (
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 44,
                zIndex: 10,
                flexDirection: "row",
                gap: 8,
                padding: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                backgroundColor: theme.colors.background,
              }}
            >
              {FEED_REACTION_TYPES.map((reaction) => {
                const meta = REACTION_META[reaction];
                const active = viewerReaction === reaction;
                return (
                  <Pressable
                    key={reaction}
                    onPress={() => void handleReactionToggle(active ? null : reaction)}
                    hitSlop={8}
                    style={{
                      minWidth: 42,
                      minHeight: 42,
                      borderRadius: 21,
                      borderWidth: 1,
                      borderColor: active ? theme.colors.primary : theme.colors.neutral200,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? theme.colors.neutral50 : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {FEED_REACTION_TYPES.map((type) => {
            const count = reactionCounts[type] ?? 0;
            if (count <= 0) return null;
            const meta = REACTION_META[type];
            return (
              <Text key={type} style={{ ...theme.typography.small, color: theme.colors.muted }}>
                {meta.emoji} {count}
              </Text>
            );
          })}
        </View>
        <Pressable onPress={handleOpenComments} disabled={!postPath}>
          <Text style={{ ...theme.typography.small, color: theme.colors.muted }}>💬 {commentCount}</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", marginLeft: "auto" }}>
          {owner ? (
            <>
              <Pressable
                onPress={handleStartEdit}
                disabled={saving || shareLoading}
                accessibilityRole="button"
                accessibilityLabel="Modifica questo post"
                style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: saving ? 0.5 : 1 }}
              >
                <Feather name="edit-2" size={18} color={theme.colors.text} />
              </Pressable>
              <Pressable
                onPress={handleDelete}
                disabled={saving || shareLoading}
                accessibilityRole="button"
                accessibilityLabel="Elimina questo post"
                style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: saving ? 0.5 : 1 }}
              >
                <Feather name="trash-2" size={18} color={theme.colors.text} />
              </Pressable>
            </>
          ) : null}
          <Pressable
            onPress={handleShare}
            disabled={saving || shareLoading}
            accessibilityRole="button"
            accessibilityLabel="Condividi questo post"
            style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: shareLoading ? 0.5 : 1 }}
          >
            <Feather name="share-2" size={18} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      <Modal visible={editingOpen} animationType="slide" transparent onRequestClose={() => setEditingOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", padding: 18 }}>
          <View style={{ backgroundColor: theme.colors.background, borderRadius: 14, padding: 14, gap: 10 }}>
            <Text style={{ fontWeight: "800", fontSize: 16, color: theme.colors.text }}>Modifica post</Text>
            <TextInput
              value={editDraft}
              onChangeText={setEditDraft}
              multiline
              maxLength={4000}
              editable={!saving}
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
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
              <Pressable onPress={() => setEditingOpen(false)} disabled={saving} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12 }}>
                <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>Annulla</Text>
              </Pressable>
              <Pressable onPress={() => void handleSubmitEdit()} disabled={saving} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12 }}>
                <Text style={{ color: theme.colors.primary, fontWeight: "800" }}>{saving ? "Salvataggio…" : "Salva"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
