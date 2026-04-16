import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchReactionsForIds, setPostReaction } from "../api";

type TogglePostLikeParams = {
  postId: string;
  supabase: SupabaseClient;
};

type TogglePostLikeResult = {
  liked: boolean;
  likeCountDelta: number;
};

function readLikeCount(counts: Array<{ post_id: string; reaction: string; count: number }> | undefined, postId: string): number | null {
  if (!Array.isArray(counts)) return null;
  const row = counts.find((item) => item?.post_id === postId && item?.reaction === "like");
  return typeof row?.count === "number" ? row.count : null;
}

export async function togglePostLike({
  postId,
  supabase,
}: TogglePostLikeParams): Promise<TogglePostLikeResult> {
  // Manteniamo il parametro per retro-compatibilità call-site.
  void supabase;

  const beforeRes = await fetchReactionsForIds([postId]);
  if (!beforeRes.ok) {
    throw new Error(beforeRes.errorText ?? `Reactions HTTP ${beforeRes.status}`);
  }

  const beforeLiked = (beforeRes.data?.mine ?? []).some((row) => row?.post_id === postId && row?.reaction === "like");
  const beforeCount = readLikeCount(beforeRes.data?.counts, postId);

  // Parity web: unlike = reaction: null
  const toggleRes = await setPostReaction(postId, beforeLiked ? null : "like");
  if (!toggleRes.ok) {
    throw new Error(toggleRes.errorText ?? `Toggle HTTP ${toggleRes.status}`);
  }

  const liked = toggleRes.data?.mine === "like";
  const afterCount = readLikeCount(toggleRes.data?.counts, postId);

  const likeCountDelta =
    typeof beforeCount === "number" && typeof afterCount === "number"
      ? afterCount - beforeCount
      : liked
        ? 1
        : -1;

  return { liked, likeCountDelta };
}
