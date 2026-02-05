import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveProfilesByAuthorIds } from '../profiles/resolveProfile';
import { asString, normalizeMediaRow, type NormalizedMediaItem } from '../media/normalizeMedia';

export type FeedMediaItem = NormalizedMediaItem;

export type FeedAuthor = {
  id?: string;
  user_id?: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  type?: string | null;
  account_type?: string | null;
  role?: string | null;
};

export type FeedPost = {
  id: string;
  author_id?: string | null;
  created_at?: string | null;
  raw: Record<string, any>;
  author?: FeedAuthor | null;
  media: FeedMediaItem[];
  likeCount?: number;
  commentCount?: number;
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

type SocialSource = { table: string; postColumn: string };

const LIKE_TABLE_CANDIDATES = ['likes', 'post_likes', 'likes_posts', 'reactions', 'post_reactions'];
const LIKE_POST_COLUMNS = ['post_id', 'postId', 'post_uuid', 'post'];

const COMMENT_TABLE_CANDIDATES = ['comments', 'post_comments', 'comments_posts'];
const COMMENT_POST_COLUMNS = ['post_id', 'postId', 'post_uuid', 'post'];

async function discoverSocialSource(
  supabase: SupabaseClient,
  postIds: string[],
  tables: string[],
  columns: string[],
): Promise<SocialSource | null> {
  for (const table of tables) {
    for (const postColumn of columns) {
      const { error } = await supabase.from(table).select(postColumn).in(postColumn, postIds).limit(1);
      if (!error) return { table, postColumn };
    }
  }
  return null;
}

async function fetchCountsByPost(
  supabase: SupabaseClient,
  postIds: string[],
  tables: string[],
  columns: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!postIds.length) return counts;

  try {
    const source = await discoverSocialSource(supabase, postIds, tables, columns);
    if (!source) return counts;

    const { data, error } = await supabase
      .from(source.table)
      .select(source.postColumn)
      .in(source.postColumn, postIds);
    if (error || !Array.isArray(data)) return counts;

    for (const row of data) {
      const pid = asString((row as any)?.[source.postColumn]);
      if (!pid) continue;
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
  } catch {
    return counts;
  }

  return counts;
}

type FeedMode = 'all' | 'following';

type FollowQueryCandidate = {
  table: string;
  followerColumn: string;
  followedColumn: string;
};

const FOLLOW_TABLE_CANDIDATES: FollowQueryCandidate[] = [
  { table: 'follows', followerColumn: 'follower_id', followedColumn: 'following_id' },
  { table: 'follows', followerColumn: 'user_id', followedColumn: 'following_id' },
  { table: 'follows', followerColumn: 'follower_id', followedColumn: 'followed_id' },
  { table: 'follows', followerColumn: 'user_id', followedColumn: 'followed_id' },
  { table: 'followers', followerColumn: 'follower_id', followedColumn: 'following_id' },
  { table: 'followers', followerColumn: 'user_id', followedColumn: 'following_id' },
  { table: 'profile_follows', followerColumn: 'follower_id', followedColumn: 'following_id' },
  { table: 'user_follows', followerColumn: 'follower_id', followedColumn: 'following_id' },
];

type FollowDiscoveryStatus = 'ok' | 'no_follow_rows' | 'discovery_failed';

async function fetchFollowedIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  ids: string[];
  sourceTable?: string;
  status: FollowDiscoveryStatus;
  lastError?: string;
}> {
  let lastError: string | undefined;
  for (const candidate of FOLLOW_TABLE_CANDIDATES) {
    const { data, error } = await supabase
      .from(candidate.table)
      .select(candidate.followedColumn)
      .eq(candidate.followerColumn, userId);

    if (error) {
      lastError = error.message || String(error);
      continue;
    }

    const rows = Array.isArray(data) ? data : [];
    const ids = rows
      .map((row: any) => asString(row?.[candidate.followedColumn]))
      .filter(Boolean) as string[];

    if (ids.length === 0) {
      return { ids: [], sourceTable: candidate.table, status: 'no_follow_rows' };
    }

    return { ids: uniq(ids), sourceTable: candidate.table, status: 'ok' };
  }

  return { ids: [], status: 'discovery_failed', lastError };
}

async function normalizeFollowedIds(
  supabase: SupabaseClient,
  followedIds: string[],
): Promise<{ followedUserIds: string[]; followedProfileIds: string[] }> {
  if (!followedIds.length) return { followedUserIds: [], followedProfileIds: [] };

  const [byUserId, byProfileId] = await Promise.all([
    supabase.from('profiles').select('id,user_id').in('user_id', followedIds),
    supabase.from('profiles').select('id,user_id').in('id', followedIds),
  ]);

  const userIds = new Set<string>();
  const profileIds = new Set<string>();

  const pushProfile = (p: any) => {
    const pid = asString(p?.id);
    const uid = asString(p?.user_id);
    if (uid) userIds.add(uid);
    if (pid) profileIds.add(pid);
  };

  if (!byUserId.error && Array.isArray(byUserId.data)) byUserId.data.forEach(pushProfile);
  if (!byProfileId.error && Array.isArray(byProfileId.data)) byProfileId.data.forEach(pushProfile);

  return { followedUserIds: Array.from(userIds), followedProfileIds: Array.from(profileIds) };
}

type AuthorIdMode = 'user_id' | 'profile_id' | 'unknown';

async function resolveAuthorIdMode({
  supabase,
  followedUserIds,
  followedProfileIds,
  limit,
  offset,
}: {
  supabase: SupabaseClient;
  followedUserIds: string[];
  followedProfileIds: string[];
  limit: number;
  offset: number;
}): Promise<AuthorIdMode> {
  if (followedUserIds.length > 0 && followedProfileIds.length === 0) return 'user_id';
  if (followedProfileIds.length > 0 && followedUserIds.length === 0) return 'profile_id';
  if (followedProfileIds.length === 0 && followedUserIds.length === 0) return 'unknown';

  const [byUser, byProfile] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .in('author_id', followedUserIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .in('author_id', followedProfileIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
  ]);

  const userCount = typeof byUser.count === 'number' ? byUser.count : 0;
  const profileCount = typeof byProfile.count === 'number' ? byProfile.count : 0;

  if (userCount === 0 && profileCount > 0) return 'profile_id';
  if (profileCount === 0 && userCount > 0) return 'user_id';
  if (userCount >= profileCount) return 'user_id';
  return 'profile_id';
}

export async function getFeedPosts(
  supabase: SupabaseClient,
  opts?: { limit?: number; offset?: number; mode?: FeedMode },
): Promise<{
  items: FeedPost[];
  nextOffset: number | null;
  meta: {
    followedIdsCount?: number;
    followedUserIdsCount?: number;
    followedProfileIdsCount?: number;
    authorIdModeUsed?: AuthorIdMode;
    followDiscoveryStatus?: FollowDiscoveryStatus;
    followSourceTable?: string;
    followDiscoveryError?: string;
  };
}> {
  const limit = Math.min(Math.max(opts?.limit ?? 15, 5), 30);
  const offset = Math.max(opts?.offset ?? 0, 0);
  const mode: FeedMode = opts?.mode ?? 'all';

  let followedIds: string[] | null = null;
  let followDiscoveryStatus: FollowDiscoveryStatus | undefined;
  let followSourceTable: string | undefined;
  let followDiscoveryError: string | undefined;
  let followedUserIds: string[] = [];
  let followedProfileIds: string[] = [];
  let authorIdModeUsed: AuthorIdMode = 'unknown';
  if (mode === 'following') {
    const { data: auth } = await supabase.auth.getUser();
    const userId = asString(auth.user?.id);
    if (!userId) {
      return {
        items: [],
        nextOffset: null,
        meta: {
          followedIdsCount: 0,
          followedUserIdsCount: 0,
          followedProfileIdsCount: 0,
          authorIdModeUsed: 'unknown',
          followDiscoveryStatus: 'ok',
        },
      };
    }
    const discovery = await fetchFollowedIds(supabase, userId);
    followedIds = discovery.ids;
    followDiscoveryStatus = discovery.status;
    followSourceTable = discovery.sourceTable;
    if (__DEV__ && discovery.lastError) {
      followDiscoveryError = discovery.lastError;
    }
    if (discovery.status === 'discovery_failed') {
      return {
        items: [],
        nextOffset: null,
        meta: {
          followedIdsCount: 0,
          followedUserIdsCount: 0,
          followedProfileIdsCount: 0,
          authorIdModeUsed: 'unknown',
          followDiscoveryStatus: discovery.status,
          followSourceTable,
          followDiscoveryError,
        },
      };
    }
    if (!followedIds.length) {
      return {
        items: [],
        nextOffset: null,
        meta: {
          followedIdsCount: 0,
          followedUserIdsCount: 0,
          followedProfileIdsCount: 0,
          authorIdModeUsed: 'unknown',
          followDiscoveryStatus: discovery.status,
          followSourceTable,
          followDiscoveryError,
        },
      };
    }

    const normalized = await normalizeFollowedIds(supabase, followedIds);
    followedUserIds = normalized.followedUserIds;
    followedProfileIds = normalized.followedProfileIds;
    authorIdModeUsed = await resolveAuthorIdMode({
      supabase,
      followedUserIds,
      followedProfileIds,
      limit,
      offset,
    });
  }

  // v1: posts + media + author hydration (come web) ma read-only; filtro following opzionale
  let postsQuery = supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (mode === 'following' && (followedUserIds.length || followedProfileIds.length)) {
    if (authorIdModeUsed === 'profile_id') {
      postsQuery = postsQuery.in('author_id', followedProfileIds);
    } else if (authorIdModeUsed === 'user_id') {
      postsQuery = postsQuery.in('author_id', followedUserIds);
    } else if (followedUserIds.length) {
      postsQuery = postsQuery.in('author_id', followedUserIds);
    } else {
      postsQuery = postsQuery.in('author_id', followedProfileIds);
    }
  }

  const { data: posts, error } = await postsQuery.range(offset, offset + limit - 1);

  if (error) throw new Error(error.message || 'Errore nel recupero dei post');

  const rows = Array.isArray(posts) ? posts : [];
  const postIds = uniq(rows.map((r: any) => asString(r?.id)).filter(Boolean) as string[]);
  const authorIds = uniq(rows.map((r: any) => asString(r?.author_id)).filter(Boolean) as string[]);

  const [likeCounts, commentCounts] = await Promise.all([
    fetchCountsByPost(supabase, postIds, LIKE_TABLE_CANDIDATES, LIKE_POST_COLUMNS),
    fetchCountsByPost(supabase, postIds, COMMENT_TABLE_CANDIDATES, COMMENT_POST_COLUMNS),
  ]);

  // media
  const mediaByPost = new Map<string, FeedMediaItem[]>();
  if (postIds.length) {
    const { data: mediaRows, error: mediaErr } = await supabase
      .from('post_media')
      .select('id, post_id, media_type, url, poster_url, width, height, position')
      .in('post_id', postIds)
      .order('position', { ascending: true });

    if (!mediaErr && Array.isArray(mediaRows)) {
      for (const mr of mediaRows) {
        const postId = asString((mr as any)?.post_id);
        const normalized = normalizeMediaRow(mr);
        if (!postId || !normalized) continue;
        const list = mediaByPost.get(postId) ?? [];
        list.push(normalized);
        mediaByPost.set(postId, list);
      }
    }
  }

  // authors (fallback: profiles.user_id OR profiles.id)
  const authorById = new Map<string, FeedAuthor>();
  if (authorIds.length) {
    const profilesById = await resolveProfilesByAuthorIds(authorIds, supabase);
    for (const [key, profile] of profilesById.entries()) {
      authorById.set(key, {
        id: profile.id,
        user_id: profile.user_id ?? undefined,
        full_name: profile.full_name,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        type: profile.type,
        account_type: profile.account_type,
        role: profile.role,
      });
    }
  }

  const items: FeedPost[] = rows
    .map((r: any) => {
      const id = asString(r?.id);
      if (!id) return null;
      const authorId = asString(r?.author_id);
      return {
        id,
        author_id: authorId,
        created_at: asString(r?.created_at),
        raw: r ?? {},
        author: authorId ? authorById.get(authorId) ?? null : null,
        media: mediaByPost.get(id) ?? [],
        likeCount: likeCounts.get(id) ?? 0,
        commentCount: commentCounts.get(id) ?? 0,
      };
    })
    .filter(Boolean) as FeedPost[];

  const nextOffset = rows.length < limit ? null : offset + limit;
  return {
    items,
    nextOffset,
    meta: {
      followedIdsCount: followedIds ? followedIds.length : undefined,
      followedUserIdsCount: followedUserIds.length,
      followedProfileIdsCount: followedProfileIds.length,
      authorIdModeUsed: mode === 'following' ? authorIdModeUsed : undefined,
      followDiscoveryStatus: mode === 'following' ? followDiscoveryStatus : undefined,
      followSourceTable,
      followDiscoveryError,
    },
  };
}

export function getPostText(raw: Record<string, any>): string {
  const candidates = [raw?.text, raw?.content, raw?.body, raw?.message, raw?.caption, raw?.description];
  const found = candidates.find((v) => typeof v === 'string' && v.trim().length > 0);
  return (found ?? '').toString().trim();
}

function isEmailLike(value: string): boolean {
  return value.includes('@');
}

export function getAuthorName(author?: FeedAuthor | null): string {
  const fullName = author?.full_name?.trim() ?? '';
  if (fullName && !isEmailLike(fullName)) {
    return fullName;
  }

  const displayName = author?.display_name?.trim() ?? '';
  const name = displayName && !isEmailLike(displayName) ? displayName : '';
  return name || 'Utente';
}
