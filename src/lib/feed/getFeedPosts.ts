import type { SupabaseClient } from '@supabase/supabase-js';

export type FeedMediaItem = {
  id?: string;
  post_id?: string;
  media_type: 'image' | 'video';
  url: string;
  poster_url?: string | null;
  width?: number | null;
  height?: number | null;
  position?: number;
};

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
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function asString(v: any): string | null {
  if (typeof v === 'string') return v;
  if (v == null) return null;
  try {
    return String(v);
  } catch {
    return null;
  }
}

function normalizeMediaRow(row: any): FeedMediaItem | null {
  const mediaType = typeof row?.media_type === 'string' ? row.media_type.trim().toLowerCase() : '';
  if (mediaType !== 'image' && mediaType !== 'video') return null;

  const url = asString(row?.url);
  if (!url) return null;

  const poster = asString(row?.poster_url) ?? asString(row?.posterUrl);
  const width = Number.isFinite(row?.width) ? Number(row.width) : null;
  const height = Number.isFinite(row?.height) ? Number(row.height) : null;
  const position = Number.isFinite(row?.position) ? Math.trunc(Number(row.position)) : undefined;

  return {
    id: asString(row?.id) ?? undefined,
    post_id: asString(row?.post_id) ?? undefined,
    media_type: mediaType as 'image' | 'video',
    url,
    poster_url: poster || null,
    width,
    height,
    position,
  };
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

async function fetchFollowedIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ids: string[]; sourceTable: string | null }> {
  for (const candidate of FOLLOW_TABLE_CANDIDATES) {
    const { data, error } = await supabase
      .from(candidate.table)
      .select(candidate.followedColumn)
      .eq(candidate.followerColumn, userId);

    if (error) {
      continue;
    }

    const rows = Array.isArray(data) ? data : [];
    const ids = rows
      .map((row: any) => asString(row?.[candidate.followedColumn]))
      .filter(Boolean) as string[];

    return { ids: uniq(ids), sourceTable: candidate.table };
  }

  return { ids: [], sourceTable: null };
}

export async function getFeedPosts(
  supabase: SupabaseClient,
  opts?: { limit?: number; offset?: number; mode?: FeedMode },
): Promise<{ items: FeedPost[]; nextOffset: number | null; meta: { followedCount?: number } }> {
  const limit = Math.min(Math.max(opts?.limit ?? 15, 5), 30);
  const offset = Math.max(opts?.offset ?? 0, 0);
  const mode: FeedMode = opts?.mode ?? 'all';

  let followedIds: string[] | null = null;
  if (mode === 'following') {
    const { data: auth } = await supabase.auth.getUser();
    const userId = asString(auth.user?.id);
    if (!userId) {
      return { items: [], nextOffset: null, meta: { followedCount: 0 } };
    }
    const res = await fetchFollowedIds(supabase, userId);
    followedIds = res.ids;
    if (!followedIds.length) {
      return { items: [], nextOffset: null, meta: { followedCount: 0 } };
    }
  }

  // v1: posts + media + author hydration (come web) ma read-only; filtro following opzionale
  let postsQuery = supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (mode === 'following' && followedIds) {
    postsQuery = postsQuery.in('author_id', followedIds);
  }

  const { data: posts, error } = await postsQuery.range(offset, offset + limit - 1);

  if (error) throw new Error(error.message || 'Errore nel recupero dei post');

  const rows = Array.isArray(posts) ? posts : [];
  const postIds = uniq(rows.map((r: any) => asString(r?.id)).filter(Boolean) as string[]);
  const authorIds = uniq(rows.map((r: any) => asString(r?.author_id)).filter(Boolean) as string[]);

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
    const [byUserId, byProfileId] = await Promise.all([
      supabase.from('profiles').select('*').in('user_id', authorIds),
      supabase.from('profiles').select('*').in('id', authorIds),
    ]);

    const pushProfile = (p: any) => {
      const pid = asString(p?.id);
      const uid = asString(p?.user_id);
      const key = uid || pid;
      if (!key) return;
      authorById.set(key, p as FeedAuthor);
    };

    if (!byUserId.error && Array.isArray(byUserId.data)) byUserId.data.forEach(pushProfile);
    if (!byProfileId.error && Array.isArray(byProfileId.data)) byProfileId.data.forEach(pushProfile);
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
      };
    })
    .filter(Boolean) as FeedPost[];

  const nextOffset = rows.length < limit ? null : offset + limit;
  return { items, nextOffset, meta: { followedCount: followedIds ? followedIds.length : undefined } };
}

export function getPostText(raw: Record<string, any>): string {
  const candidates = [raw?.text, raw?.content, raw?.body, raw?.message, raw?.caption, raw?.description];
  const found = candidates.find((v) => typeof v === 'string' && v.trim().length > 0);
  return (found ?? '').toString().trim();
}

export function getAuthorName(author?: FeedAuthor | null): string {
  const name =
    (author?.display_name && author.display_name.trim()) ||
    (author?.full_name && author.full_name.trim()) ||
    '';
  return name || 'Utente';
}
