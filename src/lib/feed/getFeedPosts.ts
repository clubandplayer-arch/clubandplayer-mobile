import {
  fetchCommentCountsForIds,
  fetchFeedPosts,
  fetchReactionsForIds,
  type FeedCommentsCountsGetResponse,
  type FeedReactionsGetResponse,
} from "../api";

export type FeedAuthor = {
  id?: string;
  user_id?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  account_type?: string | null;
  type?: string | null;
};

export type FeedMedia = {
  url: string;
  poster_url?: string | null;
  media_type?: "image" | "video" | string;
  aspect?: number | null;
};

export type FeedPost = {
  id: string;
  created_at?: string | null;
  author_id?: string | null;

  author: FeedAuthor | null;
  raw: Record<string, any>;
  media: FeedMedia[];

  // computed parity fields (WEB does this client-side)
  likeCount?: number;
  commentCount?: number;
  viewerHasLiked?: boolean;
};

export function getAuthorName(author: FeedAuthor | null): string {
  if (!author) return "Utente";
  return (
    author.full_name ||
    author.display_name ||
    (author.user_id ? `User ${String(author.user_id).slice(0, 6)}` : "Utente")
  );
}

export function getPostText(raw: Record<string, any>): string {
  const v = raw?.content;
  return typeof v === "string" ? v : "";
}

function normalizeFeedPostsPayload(json: any): { items: any[]; nextPage: string | null } {
  const payload = json && typeof json === "object" && "data" in json ? json.data : json;
  const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  const nextPageRaw = payload?.nextPage ?? null;
  const nextPage =
    nextPageRaw == null ? null : typeof nextPageRaw === "string" ? nextPageRaw : String(nextPageRaw);
  return { items, nextPage };
}

function toStr(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (v == null) return null;
  try {
    return String(v);
  } catch {
    return null;
  }
}

function normalizeAuthor(raw: any): FeedAuthor | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: toStr(raw.id) ?? undefined,
    user_id: toStr(raw.user_id) ?? null,
    full_name: typeof raw.full_name === "string" ? raw.full_name : null,
    display_name: typeof raw.display_name === "string" ? raw.display_name : null,
    avatar_url: typeof raw.avatar_url === "string" ? raw.avatar_url : null,
    account_type: typeof raw.account_type === "string" ? raw.account_type : null,
    type: typeof raw.type === "string" ? raw.type : null,
  };
}

function normalizeMedia(raw: any): FeedMedia[] {
  const media = raw?.media;
  if (!Array.isArray(media)) return [];
  return media
    .map((m: any) => {
      const url = toStr(m?.url);
      if (!url) return null;
      return {
        url,
        poster_url: toStr(m?.poster_url) ?? null,
        media_type: (toStr(m?.media_type) ?? "image") as any,
        aspect: typeof m?.aspect === "number" ? m.aspect : null,
      } as FeedMedia;
    })
    .filter(Boolean) as FeedMedia[];
}

function buildCountsMaps(
  reactions: FeedReactionsGetResponse | null,
  comments: FeedCommentsCountsGetResponse | null,
) {
  const likeCountByPost = new Map<string, number>();
  const viewerLikedSet = new Set<string>();
  const commentCountByPost = new Map<string, number>();

  if (reactions?.ok) {
    for (const row of reactions.counts || []) {
      if (row?.reaction === "like" && row?.post_id) {
        likeCountByPost.set(row.post_id, Number(row.count) || 0);
      }
    }
    for (const m of reactions.mine || []) {
      if (m?.reaction === "like" && m?.post_id) {
        viewerLikedSet.add(m.post_id);
      }
    }
  }

  if (comments?.ok) {
    for (const row of comments.counts || []) {
      if (row?.post_id) commentCountByPost.set(row.post_id, Number(row.count) || 0);
    }
  }

  return { likeCountByPost, viewerLikedSet, commentCountByPost };
}

export async function getFeedPosts(params: {
  scope: "all" | "following";
  nextPage?: string | null;
}): Promise<{ items: FeedPost[]; nextPage: string | null }> {
  const res = await fetchFeedPosts({
    scope: params.scope,
    nextPage: params.nextPage ?? undefined,
  });

  if (!res.ok) {
    throw new Error(res.errorText ?? `Feed HTTP ${res.status}`);
  }

  const { items: rawItems, nextPage } = normalizeFeedPostsPayload(res.data);

  const posts: FeedPost[] = rawItems.map((raw: any) => {
    const id = toStr(raw?.id) ?? "";
    const author = normalizeAuthor(raw?.author ?? raw?.profiles ?? raw?.profile ?? null);

    return {
      id,
      created_at: toStr(raw?.created_at),
      author_id: toStr(raw?.author_id),
      author,
      raw: raw ?? {},
      media: normalizeMedia(raw),
      likeCount: 0,
      commentCount: 0,
      viewerHasLiked: false,
    };
  }).filter((p) => !!p.id);

  // ✅ WEB parity: fetch reactions+comments counts separately using ids=...
  const ids = posts.map((p) => p.id);
  if (ids.length === 0) return { items: posts, nextPage };

  const [reactionsRes, commentsRes] = await Promise.all([
    fetchReactionsForIds(ids),
    fetchCommentCountsForIds(ids),
  ]);

  const reactions = reactionsRes.ok ? (reactionsRes.data ?? null) : null;
  const comments = commentsRes.ok ? (commentsRes.data ?? null) : null;

  const { likeCountByPost, viewerLikedSet, commentCountByPost } = buildCountsMaps(reactions, comments);

  const items = posts.map((p) => ({
    ...p,
    likeCount: likeCountByPost.get(p.id) ?? 0,
    commentCount: commentCountByPost.get(p.id) ?? 0,
    viewerHasLiked: viewerLikedSet.has(p.id),
  }));

  return { items, nextPage };
}
