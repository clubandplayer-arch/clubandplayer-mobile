import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveProfileByAuthorId } from "../profiles/resolveProfile";
import { devLog, devWarn } from "../debug/devLog";
import { getCachedFollowSource, setCachedFollowSource } from "./discoveryCache";

export type FollowSocial = {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  discoveryStatus: "ok" | "no_rows" | "discovery_failed";
  sourceTable?: string;
};

type FollowQueryCandidate = {
  table: string;
  followerColumn: string;
  followedColumn: string;
};

const FOLLOW_TABLE_CANDIDATES: FollowQueryCandidate[] = [
  { table: "follows", followerColumn: "follower_id", followedColumn: "following_id" },
  { table: "follows", followerColumn: "user_id", followedColumn: "following_id" },
  { table: "follows", followerColumn: "follower_id", followedColumn: "followed_id" },
  { table: "follows", followerColumn: "user_id", followedColumn: "followed_id" },
  { table: "followers", followerColumn: "follower_id", followedColumn: "following_id" },
  { table: "followers", followerColumn: "user_id", followedColumn: "following_id" },
  { table: "profile_follows", followerColumn: "follower_id", followedColumn: "following_id" },
  { table: "user_follows", followerColumn: "follower_id", followedColumn: "following_id" },
];

function uniq(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

async function resolveProfileIds(authorId: string | null, supabase: SupabaseClient) {
  if (!authorId) return { profileId: null, userId: null };
  const profile = await resolveProfileByAuthorId(authorId, supabase);
  return { profileId: profile?.id ?? null, userId: profile?.user_id ?? null };
}

async function discoverFollowSource(
  supabase: SupabaseClient,
  targetIds: string[],
): Promise<{ candidate: FollowQueryCandidate } | null> {
  const cached = getCachedFollowSource();
  if (cached) {
    return {
      candidate: {
        table: cached.table,
        followerColumn: cached.followerColumn,
        followedColumn: cached.followedColumn,
      },
    };
  }

  let lastError: string | undefined;
  for (const candidate of FOLLOW_TABLE_CANDIDATES) {
    for (const targetId of targetIds) {
      const { error } = await supabase
        .from(candidate.table)
        .select("id", { count: "exact", head: true })
        .eq(candidate.followedColumn, targetId);
      if (!error) {
        setCachedFollowSource(candidate);
        devLog("discovered follow source", candidate);
        return { candidate };
      }
      lastError = error?.message ?? String(error);
    }
  }

  devWarn("follow discovery failed", {
    triedCandidates: FOLLOW_TABLE_CANDIDATES,
    targetIds,
    lastError,
  });
  return null;
}

async function countRows(
  supabase: SupabaseClient,
  candidate: FollowQueryCandidate,
  column: string,
  value: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(candidate.table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error || typeof count !== "number") return 0;
  return count;
}

async function resolveIsFollowing(
  supabase: SupabaseClient,
  candidate: FollowQueryCandidate,
  viewerIds: string[],
  targetIds: string[],
): Promise<boolean> {
  for (const viewerId of viewerIds) {
    for (const targetId of targetIds) {
      const { count, error } = await supabase
        .from(candidate.table)
        .select("id", { count: "exact", head: true })
        .eq(candidate.followerColumn, viewerId)
        .eq(candidate.followedColumn, targetId);
      if (!error && typeof count === "number" && count > 0) return true;
    }
  }
  return false;
}

export async function getFollowSocialForProfile({
  viewerUserId,
  profileKey,
  supabase,
}: {
  viewerUserId: string | null;
  profileKey: string;
  supabase: SupabaseClient;
}): Promise<FollowSocial> {
  try {
    const targetProfile = await resolveProfileByAuthorId(profileKey, supabase);
    if (!targetProfile) {
      return {
        isFollowing: false,
        followerCount: 0,
        followingCount: 0,
        discoveryStatus: "discovery_failed",
      };
    }

    const targetProfileId = targetProfile.id;
    const targetUserId = targetProfile.user_id ?? null;
    const targetIds = uniq([targetProfileId, targetUserId]);

    const viewerResolved = await resolveProfileIds(viewerUserId, supabase);
    const viewerIds = uniq([viewerUserId, viewerResolved.profileId]);

    const source = await discoverFollowSource(supabase, targetIds);
    if (!source) {
      return {
        isFollowing: false,
        followerCount: 0,
        followingCount: 0,
        discoveryStatus: "discovery_failed",
      };
    }

    const followerCounts = await Promise.all(
      targetIds.map((targetId) =>
        countRows(supabase, source.candidate, source.candidate.followedColumn, targetId),
      ),
    );
    const followerCount = followerCounts.length ? Math.max(...followerCounts) : 0;

    const followingCounts = await Promise.all(
      targetIds.map((targetId) =>
        countRows(supabase, source.candidate, source.candidate.followerColumn, targetId),
      ),
    );
    const followingCount = followingCounts.length ? Math.max(...followingCounts) : 0;

    const isFollowing = viewerIds.length
      ? await resolveIsFollowing(supabase, source.candidate, viewerIds, targetIds)
      : false;

    const discoveryStatus =
      followerCount === 0 && followingCount === 0 && !isFollowing
        ? "no_rows"
        : "ok";

    return {
      isFollowing,
      followerCount,
      followingCount,
      discoveryStatus,
      sourceTable: source.candidate.table,
    };
  } catch {
    return {
      isFollowing: false,
      followerCount: 0,
      followingCount: 0,
      discoveryStatus: "discovery_failed",
    };
  }
}
