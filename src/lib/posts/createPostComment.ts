import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedOrDiscoverCommentSource } from "./getPostSocial";

type CreatePostCommentParams = {
  postId: string;
  content: string;
  supabase: SupabaseClient;
};

type CreatePostCommentResult = {
  id?: string;
  created_at?: string;
};

function normalizeContent(value: string): string {
  return value.trim().slice(0, 2000);
}

function getReadableInsertError(error: any): string {
  const rawMessage = String(error?.message ?? "");
  const lowered = rawMessage.toLowerCase();
  if (
    lowered.includes("row-level security") ||
    lowered.includes("permission denied") ||
    lowered.includes("not allowed")
  ) {
    return "Non hai i permessi per commentare questo post.";
  }
  return rawMessage || "Impossibile pubblicare il commento.";
}

export async function createPostComment({
  postId,
  content,
  supabase,
}: CreatePostCommentParams): Promise<CreatePostCommentResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewerUserId = user?.id ?? null;
  if (!viewerUserId) {
    throw new Error("Not authenticated");
  }

  const normalizedContent = normalizeContent(content);
  if (!normalizedContent) {
    throw new Error("Il commento è vuoto.");
  }

  const commentSource = await getCachedOrDiscoverCommentSource(supabase, postId);
  if (!commentSource) {
    throw new Error("Sorgente commenti non disponibile.");
  }

  const payload: Record<string, string> = {
    [commentSource.postColumn]: postId,
    [commentSource.authorColumn]: viewerUserId,
    [commentSource.contentColumn]: normalizedContent,
  };

  const selectColumns = `id, ${commentSource.createdColumn}`;
  const { data, error } = await supabase
    .from(commentSource.table)
    .insert(payload)
    .select(selectColumns)
    .single();

  if (error) {
    throw new Error(getReadableInsertError(error));
  }

  const insertedRow = (data ?? null) as unknown as Record<string, unknown> | null;
  const createdAtValue = insertedRow?.[commentSource.createdColumn];

  return {
    id: insertedRow?.id != null ? String(insertedRow.id) : undefined,
    created_at: createdAtValue != null ? String(createdAtValue) : undefined,
  };
}
