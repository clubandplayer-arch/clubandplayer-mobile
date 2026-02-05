import type { SupabaseClient } from "@supabase/supabase-js";
import { discoverPostLikeSource } from "./getPostSocial";
import { getCachedLikeUserColumn, setCachedLikeUserColumn } from "../social/discoveryCache";

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

export async function togglePostLike({
  postId,
  supabase,
}: TogglePostLikeParams): Promise<TogglePostLikeResult> {
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

  // 🔴 FIX: risolvi profile_id se necessario
  let viewerActorId = viewerUserId;

  const cachedUserColumn = getCachedLikeUserColumn();
  const columnsToTry = cachedUserColumn
    ? [cachedUserColumn, ...LIKE_USER_COLUMNS.filter((c) => c !== cachedUserColumn)]
    : LIKE_USER_COLUMNS;

  let resolvedUserColumn: string | null = null;

  for (const userColumn of columnsToTry) {
    if (userColumn === "profile_id") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", viewerUserId)
        .single();

      if (!profile?.id) continue;
      viewerActorId = profile.id;
    } else {
      viewerActorId = viewerUserId;
    }

    const { error } = await supabase
      .from(likeSource.table)
      .select("id")
      .eq(likeSource.postColumn, postId)
      .eq(userColumn, viewerActorId)
      .limit(1);

    if (!error) {
      resolvedUserColumn = userColumn;
      setCachedLikeUserColumn(userColumn);
      break;
    }
  }

  if (!resolvedUserColumn) {
    throw new Error("Colonna autore like non trovata");
  }

  const { data: existingLikeRows } = await supabase
    .from(likeSource.table)
    .select("id")
    .eq(likeSource.postColumn, postId)
    .eq(resolvedUserColumn, viewerActorId)
    .limit(1);

  const existingLike = Array.isArray(existingLikeRows) ? existingLikeRows[0] : null;

  if (existingLike) {
    const { error } = await supabase
      .from(likeSource.table)
      .delete()
      .eq("id", existingLike.id);

    if (error) throw asAuthError(asErrorMessage(error));

    return { liked: false, likeCountDelta: -1 };
  }

  const payload = {
    [likeSource.postColumn]: postId,
    [resolvedUserColumn]: viewerActorId,
  };

  const { error } = await supabase.from(likeSource.table).insert(payload);
  if (error) throw asAuthError(asErrorMessage(error));

  return { liked: true, likeCountDelta: 1 };
}
