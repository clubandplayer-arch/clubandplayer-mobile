export type MediaType = 'image' | 'video';

export type NormalizedMediaItem = {
  id?: string;
  post_id?: string;
  media_type: MediaType;
  url: string;
  poster_url?: string | null;
  width?: number | null;
  height?: number | null;
  position?: number;
};

export function asString(v: any): string | null {
  if (typeof v === 'string') return v;
  if (v == null) return null;
  try {
    return String(v);
  } catch {
    return null;
  }
}

export function normalizeMediaRow(row: any): NormalizedMediaItem | null {
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
    media_type: mediaType as MediaType,
    url,
    poster_url: poster || null,
    width,
    height,
    position,
  };
}
