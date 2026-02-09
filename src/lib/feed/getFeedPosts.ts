import { fetchFeedPosts } from "../api";
import { asString, normalizeMediaRow, type NormalizedMediaItem } from "../media/normalizeMedia";

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

type FeedMode = "all" | "following";

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMediaList(list: unknown[]): FeedMediaItem[] {
  return list
    .map((row) => normalizeMediaRow(row))
    .filter(Boolean) as FeedMediaItem[];
}

function extractMedia(item: any): FeedMediaItem[] {
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
  const candidate =
    (item?.author && typeof item.author === "object" ? item.author : null) ||
    (item?.profile && typeof item.profile === "object" ? item.profile : null) ||
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
  };
}

export async function getFeedPosts(
  opts?: { limit?: number; page?: number | string; cursor?: string; mode?: FeedMode },
): Promise<{
  items: FeedPost[];
  nextPage: number | string | null;
}> {
  const mode: FeedMode = opts?.mode ?? "all";

  const response = await fetchFeedPosts({
    scope: mode,
    limit: opts?.limit,
    page: opts?.page,
    cursor: opts?.cursor,
  });

  if (!response.ok) {
    throw new Error(response.errorText ?? "Errore nel recupero del feed");
  }

  const payload = response.data as any;
  const unwrapped =
    payload && typeof payload === "object" && "data" in payload ? (payload as any).data : payload;

  const rawItems = Array.isArray(unwrapped?.items)
    ? unwrapped.items
    : Array.isArray(unwrapped)
      ? unwrapped
      : [];

  const items = rawItems
    .map((item: any) => {
      const id = asString(item?.id);
      if (!id) return null;

      const likeCount =
        asNumber(item?.likeCount) ?? asNumber(item?.like_count) ?? asNumber(item?.reactions_count);
      const commentCount =
        asNumber(item?.commentCount) ??
        asNumber(item?.comment_count) ??
        asNumber(item?.comments_count);

      return {
        id,
        author_id: asString(item?.author_id),
        created_at: asString(item?.created_at),
        raw: item ?? {},
        author: extractAuthor(item),
        media: extractMedia(item),
        likeCount: likeCount ?? undefined,
        commentCount: commentCount ?? undefined,
      } as FeedPost;
    })
    .filter(Boolean) as FeedPost[];

  const nextPage = unwrapped?.nextPage ?? null;

  return { items, nextPage };
}

export function getPostText(raw: Record<string, any>): string {
  const candidates = [raw?.text, raw?.content, raw?.body, raw?.message, raw?.caption, raw?.description];
  const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  return (found ?? "").toString().trim();
}

function isEmailLike(value: string): boolean {
  return value.includes("@");
}

export function getAuthorName(author?: FeedAuthor | null): string {
  const fullName = author?.full_name?.trim() ?? "";
  if (fullName && !isEmailLike(fullName)) {
    return fullName;
  }

  const displayName = author?.display_name?.trim() ?? "";
  const name = displayName && !isEmailLike(displayName) ? displayName : "";
  return name || "Utente";
}
