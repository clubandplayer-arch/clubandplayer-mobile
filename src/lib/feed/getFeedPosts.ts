import {
  fetchCommentCountsForIds,
  fetchFeedPosts,
  fetchReactionsForIds,
  type FeedCommentsCountsGetResponse,
  type FeedReactionsGetResponse,
} from "../api";
import { asString, normalizeMediaRow, type NormalizedMediaItem } from "../media/normalizeMedia";
import { readCountryCodeFromCandidates } from "../geo/countryFlag";
import { getProfileDisplayName } from "../profiles/getProfileDisplayName";

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
  verified_until?: string | null;
  certified?: boolean | null;
  certification_status?: string | null;
  is_verified?: boolean | null;
  country?: string | null;
  interest_country?: string | null;
};

export type FeedPost = {
  id: string;
  author_id?: string | null;
  created_at?: string | null;
  raw: Record<string, any>;
  author?: FeedAuthor | null;
  media: FeedMediaItem[];

  // WEB parity (computed client-side)
  likeCount?: number;
  commentCount?: number;
  viewerHasLiked?: boolean;
};

type FeedScope = "all" | "following";

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMediaList(list: unknown[]): FeedMediaItem[] {
  return list.map((row) => normalizeMediaRow(row)).filter(Boolean) as FeedMediaItem[];
}

function extractMedia(item: any): FeedMediaItem[] {
  // ✅ robust (PRIMA)
  if (Array.isArray(item?.media)) {
    return normalizeMediaList(item.media);
  }
  if (Array.isArray(item?.post_media)) {
    return normalizeMediaList(item.post_media);
  }

  const mediaType = typeof item?.media_type === "string" ? item.media_type.trim().toLowerCase() : "";
  const mediaUrl = asString(item?.media_url);
  if ((mediaType === "image" || mediaType === "video") && mediaUrl) {
    return [
      {
        media_type: mediaType as "image" | "video",
        url: mediaUrl,
        poster_url: asString(item?.poster_url) ?? null,
        width: asNumber(item?.width),
        height: asNumber(item?.height),
      },
    ];
  }

  return [];
}

function extractAuthor(item: any): FeedAuthor | null {
  // ✅ robust (PRIMA) + keep DOPO variants
  const candidate =
    (item?.author && typeof item.author === "object" ? item.author : null) ||
    (item?.profile && typeof item.profile === "object" ? item.profile : null) ||
    (item?.profiles && typeof item.profiles === "object" ? item.profiles : null) ||
    (item?.author_profile && typeof item.author_profile === "object" ? item.author_profile : null);

  if (!candidate) return null;

  return {
    id: asString(candidate?.id) ?? undefined,
    user_id: asString(candidate?.user_id) ?? undefined,
    full_name: typeof candidate?.full_name === "string" ? candidate.full_name : null,
    display_name: typeof candidate?.display_name === "string" ? candidate.display_name : null,
    avatar_url: typeof candidate?.avatar_url === "string" ? candidate.avatar_url : null,
    type: typeof candidate?.type === "string" ? candidate.type : null,
    account_type: typeof candidate?.account_type === "string" ? candidate.account_type : null,
    role: typeof candidate?.role === "string" ? candidate.role : null,
    verified_until: typeof candidate?.verified_until === "string" ? candidate.verified_until : null,
    certified: typeof candidate?.certified === "boolean" ? candidate.certified : null,
    certification_status:
      typeof candidate?.certification_status === "string" ? candidate.certification_status : null,
    is_verified: typeof candidate?.is_verified === "boolean" ? candidate.is_verified : null,
    country: typeof candidate?.country === "string" ? candidate.country : null,
    interest_country: typeof candidate?.interest_country === "string" ? candidate.interest_country : null,
  };
}

function normalizeFeedPostsPayload(json: any): { items: any[]; nextPage: string | null } {
  const payload = json && typeof json === "object" && "data" in json ? json.data : json;
  const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  const nextPageRaw = payload?.nextPage ?? null;
  const nextPage =
    nextPageRaw == null ? null : typeof nextPageRaw === "string" ? nextPageRaw : String(nextPageRaw);
  return { items, nextPage };
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

export async function getFeedPosts({
  scope,
  nextPage,
}: {
  scope: FeedScope;
  nextPage?: string | null;
}): Promise<{
  items: FeedPost[];
  nextPage: string | null;
}> {
  const res = await fetchFeedPosts({
    scope,
    nextPage: nextPage ?? undefined,
  });

  if (!res.ok) {
    throw new Error(res.errorText ?? `Feed HTTP ${res.status}`);
  }

  const { items: rawItems, nextPage: nextPageToken } = normalizeFeedPostsPayload(res.data);

  // 1) build base posts exactly like PRIMA (keep author/media robust)
  const basePosts = rawItems
    .map((item: any) => {
      const id = asString(item?.id);
      if (!id) return null;

      return {
        id,
        author_id: asString(item?.author_id),
        created_at: asString(item?.created_at),
        raw: item ?? {},
        author: extractAuthor(item),
        media: extractMedia(item),
        likeCount: 0,
        commentCount: 0,
        viewerHasLiked: false,
      } as FeedPost;
    })
    .filter(Boolean) as FeedPost[];

  if (basePosts.length === 0) {
    return { items: basePosts, nextPage: nextPageToken };
  }

  // 2) WEB parity: counts are fetched separately using ids=...
  const ids = basePosts.map((p) => p.id);

  const [reactionsRes, commentsRes] = await Promise.all([
    fetchReactionsForIds(ids),
    fetchCommentCountsForIds(ids),
  ]);

  const reactions = reactionsRes.ok ? (reactionsRes.data ?? null) : null;
  const comments = commentsRes.ok ? (commentsRes.data ?? null) : null;

  const { likeCountByPost, viewerLikedSet, commentCountByPost } = buildCountsMaps(reactions, comments);

  const items = basePosts.map((p) => ({
    ...p,
    likeCount: likeCountByPost.get(p.id) ?? 0,
    commentCount: commentCountByPost.get(p.id) ?? 0,
    viewerHasLiked: viewerLikedSet.has(p.id),
  }));

  return { items, nextPage: nextPageToken };
}

export function getPostText(raw: Record<string, any>): string {
  const candidates = [raw?.text, raw?.content, raw?.body, raw?.message, raw?.caption, raw?.description];
  const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  return (found ?? "").toString().trim();
}

export function getAuthorName(author?: FeedAuthor | null): string {
  return getProfileDisplayName(author);
}

export function getFeedCountryCode(item: FeedPost): string | null {
  const raw = item.raw ?? {};
  const rawAuthor = raw?.author && typeof raw.author === "object" ? raw.author : null;
  const rawProfile = raw?.profile && typeof raw.profile === "object" ? raw.profile : null;
  const rawProfiles = raw?.profiles && typeof raw.profiles === "object" ? raw.profiles : null;
  const rawAuthorProfile =
    raw?.author_profile && typeof raw.author_profile === "object" ? raw.author_profile : null;

  return readCountryCodeFromCandidates([
    item.author?.country,
    rawAuthorProfile?.country,
    rawAuthor?.country,
    rawProfile?.country,
    rawProfiles?.country,
    raw?.country,
    item.author?.interest_country,
    rawAuthorProfile?.interest_country,
    rawAuthor?.interest_country,
    rawProfile?.interest_country,
    rawProfiles?.interest_country,
    raw?.interest_country,
  ]);
}
