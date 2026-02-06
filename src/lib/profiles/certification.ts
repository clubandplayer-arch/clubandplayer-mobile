import type { FeedAuthor } from "../feed/getFeedPosts";

const CLUB_TYPES = new Set([
  "club",
  "team",
  "societa",
  "società",
  "organization",
  "org",
  "society",
]);

export function isClubAuthor(author?: FeedAuthor | null): boolean {
  const candidates = [author?.account_type, author?.type, author?.role]
    .map((v) => (v ?? "").toString().trim().toLowerCase())
    .filter(Boolean);
  return candidates.some((value) => CLUB_TYPES.has(value));
}

export function isCertifiedClub(author: FeedAuthor): boolean {
  if (!isClubAuthor(author)) return false;

  return author.is_verified === true;
}
