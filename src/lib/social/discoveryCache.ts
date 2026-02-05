export type LikeSource = { table: string; postColumn: string };

export type CommentSource = {
  table: string;
  postColumn: string;
  authorColumn: string;
  createdColumn: string;
  contentColumn: string;
};

export type FollowSource = {
  table: string;
  followerColumn: string;
  followedColumn: string;
};

let likeSourceCache: LikeSource | null = null;
let likeUserColumnCache: string | null = null;
let commentSourceCache: CommentSource | null = null;
let followSourceCache: FollowSource | null = null;

export function getCachedLikeSource(): LikeSource | null {
  return likeSourceCache;
}

export function setCachedLikeSource(source: LikeSource | null) {
  likeSourceCache = source;
}

export function getCachedLikeUserColumn(): string | null {
  return likeUserColumnCache;
}

export function setCachedLikeUserColumn(column: string | null) {
  likeUserColumnCache = column;
}

export function getCachedCommentSource(): CommentSource | null {
  return commentSourceCache;
}

export function setCachedCommentSource(source: CommentSource | null) {
  commentSourceCache = source;
}

export function getCachedFollowSource(): FollowSource | null {
  return followSourceCache;
}

export function setCachedFollowSource(source: FollowSource | null) {
  followSourceCache = source;
}
