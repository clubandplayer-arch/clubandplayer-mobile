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

export async function getFeedPosts(
  supabase: SupabaseClient,
  opts?: { limit?: number; offset?: number },
): Promise<{ items: FeedPost[]; nextOffset: number | null }> {
  const limit = Math.min(Math.max(opts?.limit ?? 15, 5), 30);
  const offset = Math.max(opts?.offset ?? 0, 0);

  // v1: posts + media + author hydration (come web) ma read-only e senza filtri following per ora
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

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
  return { items, nextOffset };
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
