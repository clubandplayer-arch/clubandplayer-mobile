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
  const widthValue = Number(row?.width);
  const heightValue = Number(row?.height);
  const positionValue = Number(row?.position);
  const width = Number.isFinite(widthValue) ? widthValue : null;
  const height = Number.isFinite(heightValue) ? heightValue : null;
  const position = Number.isFinite(positionValue) ? Math.trunc(positionValue) : undefined;

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
