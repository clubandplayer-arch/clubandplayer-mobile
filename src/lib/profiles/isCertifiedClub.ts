export type CertifiedClubProfile = {
  accountType?: string | null;
  account_type?: string | null;
  kind?: string | null;
  type?: string | null;
  isVerified?: boolean | null;
  is_verified?: boolean | null;
} | null | undefined;

export function isCertifiedClub(profile: CertifiedClubProfile): boolean {
  if (!profile) return false;

  const clubType = (profile.accountType ?? profile.account_type ?? profile.kind ?? profile.type ?? "")
    .toString()
    .trim()
    .toLowerCase();
  const isClub = clubType === "club";
  const verified = Boolean(profile.isVerified ?? profile.is_verified);

  return isClub && verified;
}
