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

  if (author.is_verified) return true;

  const expiresAt = asTimestamp(author.verified_until);
  const hasVerifiedUntil = expiresAt != null;

  // strict mode only when verified_until is present
  if (hasVerifiedUntil && (expiresAt as number) <= Date.now()) return false;

  if (author.certified === true) return true;

  const status = (author.certification_status ?? "").trim().toLowerCase();
  if (status === "certified") return true;

  // if verified_until exists and is not expired, it is considered certified
  if (hasVerifiedUntil) return true;

  return false;
}
