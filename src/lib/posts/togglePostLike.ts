import type { SupabaseClient } from "@supabase/supabase-js";
import { discoverPostLikeSource } from "./getPostSocial";

type TogglePostLikeParams = {
  postId: string;
  supabase: SupabaseClient;
};

type TogglePostLikeResult = {
  liked: boolean;
  likeCountDelta: number;
};

const LIKE_USER_COLUMNS = ["user_id", "author_id", "profile_id", "liker_id"];

function asErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Operazione like non riuscita";
}

function asAuthError(message: string): Error {
  const lower = message.toLowerCase();
  if (lower.includes("row-level security") || lower.includes("permission") || lower.includes("not authorized")) {
    return new Error("Non autorizzato a mettere like");
  }
  return new Error(message);
}

async function discoverLikeUserColumn(
  supabase: SupabaseClient,
  table: string,
  postColumn: string,
  postId: string,
  viewerUserId: string,
): Promise<string> {
  let lastError = "";
  for (const userColumn of LIKE_USER_COLUMNS) {
    const { error } = await supabase
      .from(table)
      .select("id")
      .eq(postColumn, postId)
      .eq(userColumn, viewerUserId)
      .limit(1);

    if (!error) {
      return userColumn;
    }
    lastError = asErrorMessage(error);
  }

  throw new Error(lastError || "Colonna autore like non trovata");
}

export async function togglePostLike({ postId, supabase }: TogglePostLikeParams): Promise<TogglePostLikeResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewerUserId = user?.id ?? null;
  if (!viewerUserId) {
    throw new Error("Not authenticated");
  }

  const likeSource = await discoverPostLikeSource(supabase, postId);
  if (!likeSource) {
    throw new Error("Sorgente like non disponibile");
  }

  const userColumn = await discoverLikeUserColumn(
    supabase,
    likeSource.table,
    likeSource.postColumn,
    postId,
    viewerUserId,
  );

  const { data: existingLikeRows, error: readError } = await supabase
    .from(likeSource.table)
    .select("id")
    .eq(likeSource.postColumn, postId)
    .eq(userColumn, viewerUserId)
    .limit(1);

  if (readError) {
    throw asAuthError(asErrorMessage(readError));
  }

  const existingLike = Array.isArray(existingLikeRows) ? existingLikeRows[0] : null;

  if (existingLike) {
    let deleteQuery = supabase.from(likeSource.table).delete();
    if (existingLike.id) {
      deleteQuery = deleteQuery.eq("id", existingLike.id);
    } else {
      deleteQuery = deleteQuery.eq(likeSource.postColumn, postId).eq(userColumn, viewerUserId);
    }

    const { error: deleteError } = await deleteQuery;
    if (deleteError) {
      throw asAuthError(asErrorMessage(deleteError));
    }

    return { liked: false, likeCountDelta: -1 };
  }

  const payload = {
    [likeSource.postColumn]: postId,
    [userColumn]: viewerUserId,
  };

  const { error: insertError } = await supabase.from(likeSource.table).insert(payload);
  if (insertError) {
    throw asAuthError(asErrorMessage(insertError));
  }

  return { liked: true, likeCountDelta: 1 };
}
