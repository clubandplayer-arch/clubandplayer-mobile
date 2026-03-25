import { apiFetch } from "../api";
import { asString, normalizeMediaRow, type MediaType } from "../media/normalizeMedia";

type MyMediaApiPayload = {
  items?: unknown[];
  data?: unknown[] | { items?: unknown[] };
};

export type MyMediaItem = {
  id: string;
  post_id: string;
  media_type: MediaType;
  url: string;
  poster_url?: string | null;
  aspect?: number | null;
  content?: string;
  created_at?: string | null;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMediaItemsFromPost(item: any): MyMediaItem[] {
  const postId = asString(item?.id) ?? asString(item?.post_id);
  if (!postId) return [];

  const content = asString(item?.content) ?? asString(item?.text) ?? "";
  const createdAt = asString(item?.created_at);

  if (Array.isArray(item?.media)) {
    return item.media
      .map((rawMedia: unknown, index: number) => {
        const normalized = normalizeMediaRow(rawMedia);
        if (!normalized) return null;

        const width = asNumber(normalized.width);
        const height = asNumber(normalized.height);
        const aspect = width && height && height > 0 ? width / height : null;

        return {
          id: normalized.id ?? `${postId}-${index}`,
          post_id: postId,
          media_type: normalized.media_type,
          url: normalized.url,
          poster_url: normalized.poster_url ?? null,
          aspect,
          content,
          created_at: createdAt,
        } as MyMediaItem;
      })
      .filter(Boolean) as MyMediaItem[];
  }

  const mediaType = asString(item?.media_type)?.toLowerCase().trim();
  const mediaUrl = asString(item?.media_url);
  if (!mediaUrl || (mediaType !== "image" && mediaType !== "video")) return [];

  const width = asNumber(item?.width);
  const height = asNumber(item?.height);
  const explicitAspect = asNumber(item?.media_aspect);
  const aspect = explicitAspect ?? (width && height && height > 0 ? width / height : null);

  return [
    {
      id: `${postId}-legacy`,
      post_id: postId,
      media_type: mediaType,
      url: mediaUrl,
      poster_url: asString(item?.poster_url),
      aspect,
      content,
      created_at: createdAt,
    },
  ];
}

function getItemsFromPayload(data: MyMediaApiPayload | undefined): unknown[] {
  if (!data) return [];
  if (Array.isArray(data?.items)) return data.items;

  const payload = data?.data;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray((payload as any).items)) {
    return (payload as any).items;
  }

  return [];
}

export async function getMyMedia(limit = 60): Promise<MyMediaItem[]> {
  const params = new URLSearchParams();
  params.set("mine", "true");
  params.set("limit", String(limit));

  const res = await apiFetch<MyMediaApiPayload>(`/api/feed/posts?${params.toString()}`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(res.errorText ?? `Feed HTTP ${res.status}`);
  }

  return getItemsFromPayload(res.data).flatMap((post) => normalizeMediaItemsFromPost(post));
}

