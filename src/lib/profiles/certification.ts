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

  if (author.is_verified === true) return true;
  if (author.certified === true) return true;

  const certificationStatus = String(author.certification_status ?? "").trim().toLowerCase();
  if (certificationStatus === "approved" || certificationStatus === "verified" || certificationStatus === "active") {
    return true;
  }

  const verifiedUntil = String(author.verified_until ?? "").trim();
  if (verifiedUntil) {
    const date = new Date(verifiedUntil);
    if (!Number.isNaN(date.getTime())) {
      return date.getTime() >= Date.now();
    }
    return true;
  }

  return false;
}
