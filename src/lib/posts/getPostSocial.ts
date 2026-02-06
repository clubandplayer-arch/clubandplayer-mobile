import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedAuthor } from "../feed/getFeedPosts";
import { resolveProfileByAuthorId } from "../profiles/resolveProfile";
import { devLog, devWarn } from "../debug/devLog";
import { fetchClubVerificationMap } from "../profiles/verification";
import {
  getCachedCommentSource,
  getCachedLikeSource,
  getCachedLikeUserColumn,
  setCachedCommentSource,
  setCachedLikeSource,
  setCachedLikeUserColumn,
  type CommentSource,
  type LikeSource,
} from "../social/discoveryCache";

export type PostSocialComment = {
  id: string;
  post_id: string;
  author_id: string | null;
  created_at: string | null;
  content: string;
  author?: FeedAuthor | null;
};

export type PostSocialResult = {
  likeCount: number;
  commentCount: number;
  comments: PostSocialComment[];
  viewerHasLiked?: boolean;
};

const LIKE_TABLE_CANDIDATES = ["likes", "post_likes", "likes_posts", "reactions", "post_reactions"];
const LIKE_POST_COLUMNS = ["post_id", "postId", "post_uuid", "post"];

const COMMENT_TABLE_CANDIDATES = ["comments", "post_comments", "comments_posts"];
const COMMENT_POST_COLUMNS = ["post_id", "postId", "post_uuid", "post"];
const COMMENT_AUTHOR_COLUMNS = ["author_id", "user_id"];
const COMMENT_CREATED_COLUMNS = ["created_at", "inserted_at"];
const COMMENT_CONTENT_COLUMNS = ["content", "text", "body", "message"];

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value == null) return null;
  try {
    return String(value);
  } catch {
    return null;
  }
}

function mapToFeedAuthor(
  profile: Awaited<ReturnType<typeof resolveProfileByAuthorId>>,
  isVerified: boolean,
): FeedAuthor | null {
  if (!profile) return null;
  return {
    id: profile.id,
    user_id: profile.user_id ?? undefined,
    full_name: profile.full_name,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    type: profile.type,
    account_type: profile.account_type,
    role: profile.role,
    verified_until: profile.verified_until,
    certified: profile.certified,
    certification_status: profile.certification_status,
    is_verified: isVerified,
  };
}

export async function discoverPostLikeSource(
  supabase: SupabaseClient,
  postId: string,
): Promise<LikeSource | null> {
  const cached = getCachedLikeSource();
  if (cached) {
    return cached;
  }

  let lastError: string | undefined;
  for (const table of LIKE_TABLE_CANDIDATES) {
    for (const postColumn of LIKE_POST_COLUMNS) {
      const { error } = await supabase
        .from(table)
        .select(postColumn, { count: "exact", head: true })
        .eq(postColumn, postId);
      if (!error) {
        const source = { table, postColumn };
        setCachedLikeSource(source);
        devLog("discovered like source", source);
        return source;
      }
      lastError = error?.message ?? String(error);
    }
  }

  devWarn("like discovery failed", {
    triedTables: LIKE_TABLE_CANDIDATES,
    triedColumns: LIKE_POST_COLUMNS,
    lastError,
  });
  return null;
}

async function discoverCommentSource(
  supabase: SupabaseClient,
  postId: string,
): Promise<CommentSource | null> {
  const cached = getCachedCommentSource();
  if (cached) {
    return cached;
  }

  let lastError: string | undefined;
  for (const table of COMMENT_TABLE_CANDIDATES) {
    for (const postColumn of COMMENT_POST_COLUMNS) {
      for (const authorColumn of COMMENT_AUTHOR_COLUMNS) {
        for (const createdColumn of COMMENT_CREATED_COLUMNS) {
          for (const contentColumn of COMMENT_CONTENT_COLUMNS) {
            const { error } = await supabase
              .from(table)
              .select(`id, ${postColumn}, ${authorColumn}, ${createdColumn}, ${contentColumn}`)
              .eq(postColumn, postId)
              .limit(1);
            if (!error) {
              const source = { table, postColumn, authorColumn, createdColumn, contentColumn };
              setCachedCommentSource(source);
              devLog("discovered comment source", source);
              return source;
            }
            lastError = error?.message ?? String(error);
          }
        }
      }
    }
  }

  devWarn("comment discovery failed", {
    triedTables: COMMENT_TABLE_CANDIDATES,
    triedPostColumns: COMMENT_POST_COLUMNS,
    triedAuthorColumns: COMMENT_AUTHOR_COLUMNS,
    triedCreatedColumns: COMMENT_CREATED_COLUMNS,
    triedContentColumns: COMMENT_CONTENT_COLUMNS,
    lastError,
  });
  return null;
}

export async function getCachedOrDiscoverCommentSource(
  supabase: SupabaseClient,
  postId: string,
): Promise<CommentSource | null> {
  return discoverCommentSource(supabase, postId);
}

export async function getPostSocial(
  postId: string,
  supabase: SupabaseClient,
): Promise<PostSocialResult> {
  const fallback: PostSocialResult = { likeCount: 0, commentCount: 0, comments: [], viewerHasLiked: false };
  if (!postId) return fallback;

  try {
    let likeCount = 0;
    let viewerHasLiked = false;
    const likeSource = await discoverPostLikeSource(supabase, postId);
    if (likeSource) {
      const { count, error } = await supabase
        .from(likeSource.table)
        .select("*", { count: "exact", head: true })
        .eq(likeSource.postColumn, postId);
      if (!error && typeof count === "number") likeCount = count;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const viewerUserId = asString(user?.id);
      if (viewerUserId) {
        const cachedUserColumn = getCachedLikeUserColumn();
        const columnsToTry = cachedUserColumn
          ? [cachedUserColumn]
          : ["user_id", "author_id", "profile_id", "liker_id"];

        for (const userColumn of columnsToTry) {
          const { count: viewerLikeCount, error: viewerLikeErr } = await supabase
            .from(likeSource.table)
            .select("id", { count: "exact", head: true })
            .eq(likeSource.postColumn, postId)
            .eq(userColumn, viewerUserId);
          if (!viewerLikeErr) {
            setCachedLikeUserColumn(userColumn);
            viewerHasLiked = typeof viewerLikeCount === "number" && viewerLikeCount > 0;
            break;
          }
        }

        if (!cachedUserColumn && !viewerHasLiked) {
          for (const userColumn of ["user_id", "author_id", "profile_id", "liker_id"]) {
            if (columnsToTry.includes(userColumn)) continue;
            const { count: viewerLikeCount, error: viewerLikeErr } = await supabase
              .from(likeSource.table)
              .select("id", { count: "exact", head: true })
              .eq(likeSource.postColumn, postId)
              .eq(userColumn, viewerUserId);
            if (!viewerLikeErr) {
              setCachedLikeUserColumn(userColumn);
              viewerHasLiked = typeof viewerLikeCount === "number" && viewerLikeCount > 0;
              break;
            }
          }
        }
      }
    }

    let commentCount = 0;
    let comments: PostSocialComment[] = [];
    const commentSource = await getCachedOrDiscoverCommentSource(supabase, postId);
    if (commentSource) {
      const { count, error: countErr } = await supabase
        .from(commentSource.table)
        .select("*", { count: "exact", head: true })
        .eq(commentSource.postColumn, postId);
      if (!countErr && typeof count === "number") commentCount = count;

      const { data, error } = await supabase
        .from(commentSource.table)
        .select(
          `id, ${commentSource.postColumn}, ${commentSource.authorColumn}, ${commentSource.createdColumn}, ${commentSource.contentColumn}`,
        )
        .eq(commentSource.postColumn, postId)
        .order(commentSource.createdColumn, { ascending: false })
        .limit(20);

      if (!error && Array.isArray(data)) {
        comments = data
          .map((row: any) => {
            const id = asString(row?.id);
            if (!id) return null;
            return {
              id,
              post_id: asString(row?.[commentSource.postColumn]) ?? postId,
              author_id: asString(row?.[commentSource.authorColumn]),
              created_at: asString(row?.[commentSource.createdColumn]),
              content: (asString(row?.[commentSource.contentColumn]) ?? "").toString(),
            } as PostSocialComment;
          })
          .filter(Boolean) as PostSocialComment[];
      }
    }

    if (comments.length > 0) {
      const uniqueAuthorIds = Array.from(
        new Set(comments.map((comment) => comment.author_id).filter(Boolean) as string[]),
      );
      if (uniqueAuthorIds.length) {
        const profileMap = new Map<string, Awaited<ReturnType<typeof resolveProfileByAuthorId>> | null>();
        await Promise.all(
          uniqueAuthorIds.map(async (authorId) => {
            const profile = await resolveProfileByAuthorId(authorId, supabase);
            profileMap.set(authorId, profile);
          }),
        );
        const clubIds = Array.from(profileMap.values())
          .map((profile) => asString(profile?.id))
          .filter(Boolean) as string[];
        const verifiedMap = await fetchClubVerificationMap(supabase, clubIds);
        const authorMap = new Map<string, FeedAuthor | null>();
        for (const [authorId, profile] of profileMap.entries()) {
          const profileId = asString(profile?.id);
          const isVerified = profileId ? verifiedMap.get(profileId) ?? false : false;
          authorMap.set(authorId, mapToFeedAuthor(profile, isVerified));
        }
        comments = comments.map((comment) => ({
          ...comment,
          author: comment.author_id ? authorMap.get(comment.author_id) ?? null : null,
        }));
      }
    }

    return { likeCount, commentCount, comments, viewerHasLiked };
  } catch {
    return fallback;
  }
}
