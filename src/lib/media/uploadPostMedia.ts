import { readAsStringAsync, EncodingType } from "expo-file-system/legacy";
import type { SupabaseClient } from "@supabase/supabase-js";

type UploadPostMediaParams = {
  uri: string;
  mediaType: "image" | "video";
  supabase: SupabaseClient;
  postId: string;
  position: number;
  onProgress?: (step: string) => void;
};

type UploadPostMediaResult = {
  publicUrlOrSignedUrl: string;
  posterUrl?: string | null;
  width?: number | null;
  height?: number | null;
};

// Default bucket per media post: "post-media".
// Può essere sovrascritto con EXPO_PUBLIC_POST_MEDIA_BUCKET.
const POST_MEDIA_BUCKET = process.env.EXPO_PUBLIC_POST_MEDIA_BUCKET || "post-media";

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

function base64ToUint8Array(base64: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const str = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  let output = "";

  let i = 0;
  while (i < str.length) {
    const enc1 = chars.indexOf(str.charAt(i++));
    const enc2 = chars.indexOf(str.charAt(i++));
    const enc3 = chars.indexOf(str.charAt(i++));
    const enc4 = chars.indexOf(str.charAt(i++));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    output += String.fromCharCode(chr1);
    if (enc3 !== 64) output += String.fromCharCode(chr2);
    if (enc4 !== 64) output += String.fromCharCode(chr3);
  }

  const bytes = new Uint8Array(output.length);
  for (let j = 0; j < output.length; j += 1) {
    bytes[j] = output.charCodeAt(j);
  }
  return bytes;
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
  onProgress,
}: UploadPostMediaParams): Promise<UploadPostMediaResult> {
  if (!uri) {
    throw new Error("URI media non valida");
  }

  const ext = inferFileExtension(uri, mediaType);
  const contentType = inferContentType(ext, mediaType);
  const path = `posts/${postId}/${position}-${Date.now()}.${ext}`;

  onProgress?.("Upload file…");
  const base64 = await readAsStringAsync(uri, {
    encoding: EncodingType.Base64,
  });

  const bytes = base64ToUint8Array(base64);

  const { error: uploadError } = await supabase.storage
    .from(POST_MEDIA_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Upload media fallito");
  }

  const publicUrlOrSignedUrl = await getStoredUrl(supabase, POST_MEDIA_BUCKET, path);

  return {
    publicUrlOrSignedUrl,
    posterUrl: null,
    width: null,
    height: null,
  };
}
