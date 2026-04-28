type PostOwnershipInput = {
  authorId?: string | null;
};

export function isPostOwner(post: PostOwnershipInput | null | undefined, currentUserId: string | null | undefined): boolean {
  const viewer = typeof currentUserId === "string" ? currentUserId.trim() : "";
  const author = typeof post?.authorId === "string" ? post.authorId.trim() : "";
  return Boolean(viewer) && Boolean(author) && viewer === author;
}

export function normalizePostContent(input: string): string {
  return input.trim().slice(0, 4000);
}
