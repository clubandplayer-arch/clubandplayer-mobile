import type { SupabaseClient } from "@supabase/supabase-js";

type UploadPostMediaParams = {
  uri: string;
  mediaType: "image" | "video";
  supabase: SupabaseClient;
  postId: string;
  position: number;
};

type UploadPostMediaResult = {
  publicUrlOrSignedUrl: string;
  posterUrl?: string | null;
  width?: number | null;
  height?: number | null;
};

const BUCKET_NAME_CANDIDATES = [
  "post-media",
  "post_media",
  "posts",
  "media",
  "feed-media",
  "feed_media",
];

function inferFileExtension(uri: string, mediaType: "image" | "video") {
  const clean = uri.split("?")[0] ?? "";
  const pieces = clean.split(".");
  const ext = pieces.length > 1 ? pieces[pieces.length - 1].trim().toLowerCase() : "";
  if (ext) return ext;
  return mediaType === "video" ? "mp4" : "jpg";
}

function inferContentType(ext: string, mediaType: "image" | "video") {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    mov: "video/quicktime",
    mp4: "video/mp4",
    m4v: "video/x-m4v",
    webm: "video/webm",
  };
  return map[ext] ?? (mediaType === "video" ? "video/mp4" : "image/jpeg");
}

async function discoverBucketName(supabase: SupabaseClient): Promise<string> {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (!error && Array.isArray(buckets) && buckets.length > 0) {
    for (const candidate of BUCKET_NAME_CANDIDATES) {
      const hit = buckets.find((bucket) => bucket?.name === candidate);
      if (hit?.name) return hit.name;
    }

    const fuzzy = buckets.find((bucket) => {
      const name = String(bucket?.name ?? "").toLowerCase();
      return name.includes("post") || name.includes("media");
    });
    if (fuzzy?.name) return fuzzy.name;

    const first = buckets[0];
    if (first?.name) return first.name;
  }

  return BUCKET_NAME_CANDIDATES[0];
}

async function getStoredUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<string> {
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = publicData?.publicUrl;
  if (publicUrl) return publicUrl;

  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signedError || !signedData?.signedUrl) {
    throw new Error("Upload completato ma URL non disponibile");
  }

  return signedData.signedUrl;
}

export async function uploadPostMedia({
  uri,
  mediaType,
  supabase,
  postId,
  position,
}: UploadPostMediaParams): Promise<UploadPostMediaResult> {
  if (!uri) {
    throw new Error("URI media non valida");
  }

  const ext = inferFileExtension(uri, mediaType);
  const contentType = inferContentType(ext, mediaType);
  const bucket = await discoverBucketName(supabase);
  const path = `posts/${postId}/${position}-${Date.now()}.${ext}`;

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error("Impossibile leggere il file selezionato");
  }

  const body = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: false,
  });

  if (uploadError) {
    throw new Error(uploadError.message || "Upload media fallito");
  }

  const publicUrlOrSignedUrl = await getStoredUrl(supabase, bucket, path);

  return {
    publicUrlOrSignedUrl,
    posterUrl: null,
    width: null,
    height: null,
  };
}
