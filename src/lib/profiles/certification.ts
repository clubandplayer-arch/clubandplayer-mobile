import type { FeedAuthor } from "../feed/getFeedPosts";

const CLUB_TYPES = new Set(["club", "societa", "società", "team"]);

function asTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function isClubAuthor(author?: FeedAuthor | null): boolean {
  const candidates = [author?.account_type, author?.type, author?.role]
    .map((v) => (v ?? "").toString().trim().toLowerCase())
    .filter(Boolean);
  return candidates.some((value) => CLUB_TYPES.has(value));
}

export function isCertifiedClub(author: FeedAuthor): boolean {
  if (!isClubAuthor(author)) return false;

  const explicitCertified = author.certified === true;
  const expiresAt = asTimestamp(author.verified_until);
  const notExpired = expiresAt != null && expiresAt > Date.now();
  if (explicitCertified && notExpired) return true;

  const status = (author.certification_status ?? "").trim().toLowerCase();
  if (status === "certified" && notExpired) return true;

  return notExpired;
}
