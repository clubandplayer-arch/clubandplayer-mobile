import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadPostMedia } from "../media/uploadPostMedia";

type CreatePostParams = {
  text: string;
  media: Array<{ uri: string; mediaType: "image" | "video" }>;
  supabase: SupabaseClient;
  onProgress?: (step: string) => void;
};

type CreatePostResult = {
  postId: string;
};

const POST_TEXT_COLUMNS = ["text", "content", "caption", "body", "message", "description"];

function normalizeText(value: string): string {
  return value.trim().slice(0, 4000);
}

function readableError(error: unknown, fallback: string) {
  const message = typeof error === "object" && error && "message" in error ? (error as any).message : error;
  return typeof message === "string" && message.trim() ? message : fallback;
}

async function insertPostWithDiscovery(
  supabase: SupabaseClient,
  viewerUserId: string,
  normalizedText: string,
): Promise<{ id: string; textColumn: string | null }> {
  let lastError = "";

  if (!normalizedText) {
    const { data, error } = await supabase.from("posts").insert({ author_id: viewerUserId }).select("id").single();
    if (!error && data?.id) return { id: String(data.id), textColumn: null };
    lastError = readableError(error, "Impossibile creare il post");
  }

  for (const textColumn of POST_TEXT_COLUMNS) {
    const payload: Record<string, unknown> = {
      author_id: viewerUserId,
      [textColumn]: normalizedText,
    };

    const { data, error } = await supabase.from("posts").insert(payload).select("id").single();
    if (!error && data?.id) {
      return { id: String(data.id), textColumn };
    }

    lastError = readableError(error, "Impossibile creare il post");
  }

  throw new Error(lastError || "Impossibile creare il post");
}

export async function createPost({ text, media, supabase, onProgress }: CreatePostParams): Promise<CreatePostResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewerUserId = user?.id ?? null;
  if (!viewerUserId) {
    throw new Error("Not authenticated");
  }

  const normalizedText = normalizeText(text);
  const normalizedMedia = Array.isArray(media)
    ? media.filter((item) => item && typeof item.uri === "string" && !!item.uri.trim()).slice(0, 6)
    : [];

  if (!normalizedText && normalizedMedia.length === 0) {
    throw new Error("Inserisci testo o almeno un media");
  }

  onProgress?.("Creazione post…");
  const { id: postId } = await insertPostWithDiscovery(supabase, viewerUserId, normalizedText);

  for (let i = 0; i < normalizedMedia.length; i += 1) {
    const mediaItem = normalizedMedia[i];
    onProgress?.(`Upload media ${i + 1}/${normalizedMedia.length}…`);
    const upload = await uploadPostMedia({
      uri: mediaItem.uri,
      mediaType: mediaItem.mediaType,
      supabase,
      postId,
      position: i,
      onProgress,
    });

    onProgress?.("Salvataggio media…");
    const payload = {
      post_id: postId,
      media_type: mediaItem.mediaType,
      url: upload.publicUrlOrSignedUrl,
      poster_url: upload.posterUrl ?? null,
      width: upload.width ?? null,
      height: upload.height ?? null,
      position: i,
    };

    const { error: mediaInsertError } = await supabase.from("post_media").insert(payload);
    if (mediaInsertError) {
      throw new Error(readableError(mediaInsertError, "Post creato ma media non salvato"));
    }
  }

  onProgress?.("Completato");
  return { postId };
}
