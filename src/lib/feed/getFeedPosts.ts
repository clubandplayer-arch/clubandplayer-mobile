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
  created_at: string | null;
  raw: Record<string, any>;
  author: FeedAuthor | null;
  media: FeedMediaItem[];
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
  if (Array.isArray(item?.media) && item.media.length > 0) {
    return normalizeMediaList(item.media);
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
  if (item?.author_profile && typeof item.author_profile === "object") {
    const profile = item.author_profile;
    return {
      id: asString(profile?.id) ?? undefined,
      user_id: asString(profile?.user_id) ?? undefined,
      full_name: typeof profile?.full_name === "string" ? profile.full_name : null,
      display_name: typeof profile?.display_name === "string" ? profile.display_name : null,
      avatar_url: typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
      type: typeof profile?.type === "string" ? profile.type : null,
      account_type: typeof profile?.account_type === "string" ? profile.account_type : null,
      role: typeof profile?.role === "string" ? profile.role : null,
      verified_until: typeof profile?.verified_until === "string" ? profile.verified_until : null,
      certified: typeof profile?.certified === "boolean" ? profile.certified : null,
      certification_status:
        typeof profile?.certification_status === "string" ? profile.certification_status : null,
      is_verified: typeof profile?.is_verified === "boolean" ? profile.is_verified : null,
    };
  }

  return {
    full_name:
      typeof item?.author_full_name === "string"
        ? item.author_full_name
        : typeof item?.author_display_name === "string"
          ? item.author_display_name
          : "Utente",
    display_name:
      typeof item?.author_display_name === "string"
        ? item.author_display_name
        : typeof item?.author_full_name === "string"
          ? item.author_full_name
          : "Utente",
    avatar_url: typeof item?.author_avatar_url === "string" ? item.author_avatar_url : null,
  };
}

function normalizeFeedPostsPayload(json: any): { items: any[]; nextPage: number | null } {
  const payload = json && typeof json === "object" && "data" in json ? json.data : json;
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  const nextPageRaw = payload?.nextPage;
  const nextPage = typeof nextPageRaw === "number" ? nextPageRaw : nextPageRaw == null ? null : Number(nextPageRaw);
  return { items, nextPage: Number.isFinite(nextPage) ? nextPage : null };
}

export async function getFeedPosts({
  scope,
}: {
  scope: FeedScope;
}): Promise<{
  items: FeedPost[];
  nextPage: number | null;
}> {
  const res = await fetchFeedPosts({
    scope,
    nextPage: "?limit=10&page=0&scope=all",
  });

  if (!res.ok) {
    throw new Error(res.errorText ?? "Errore nel caricamento del feed");
  }

  const payload = res.data as any;
  if (payload && typeof payload === "object" && payload.ok === false) {
    throw new Error(
      typeof payload.message === "string" && payload.message.trim()
        ? payload.message
        : "Errore nel caricamento del feed",
    );
  }

  const { items: rawItems, nextPage } = normalizeFeedPostsPayload(payload);

  const items = rawItems
    .map((item: any) => {
      const id = asString(item?.id);
      if (!id) return null;

      const createdAtRaw = item?.created_at ?? item?.createdAt ?? null;
      const createdAt = typeof createdAtRaw === "string" ? createdAtRaw : null;

      return {
        id,
        created_at: createdAt,
        raw: item ?? {},
        author: extractAuthor(item),
        media: extractMedia(item),
      } as FeedPost;
    })
    .filter(Boolean) as FeedPost[];

  return { items, nextPage };
}

export function getPostText(raw: Record<string, any>): string {
  const value = raw?.content ?? raw?.text ?? "";
  return typeof value === "string" ? value.trim() : "";
}

function isEmailLike(value: string): boolean {
  return value.includes("@");
}

export function getAuthorName(author?: FeedAuthor | null): string {
  const displayName = author?.display_name?.trim() ?? "";
  if (displayName && !isEmailLike(displayName)) return displayName;

  const fullName = author?.full_name?.trim() ?? "";
  if (fullName && !isEmailLike(fullName)) return fullName;

  return "Utente";
}
