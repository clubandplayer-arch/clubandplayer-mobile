import type { ProfileMe } from "./api";

export const RUNTIME_PATHS = {
  login: "/login",
  signup: "/signup",
  feed: "/feed",
  chooseRole: "/choose-role",
  clubProfile: "/club/profile",
  playerProfile: "/player/profile",
  onboarding: "/",
  callback: "/callback",
} as const;

export type RuntimePath = (typeof RUNTIME_PATHS)[keyof typeof RUNTIME_PATHS];

function normalizedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getNormalizedAccountType(
  profile: ProfileMe | null | undefined,
): "club" | "athlete" | null {
  const accountType = normalizedString(profile?.account_type)?.toLowerCase();
  if (accountType === "club") return "club";
  if (accountType === "athlete") return "athlete";
  return null;
}

export function isAthleteProfileSufficient(
  profile: ProfileMe | null | undefined,
): boolean {
  return Boolean(
    normalizedString(profile?.full_name ?? profile?.display_name) &&
    normalizedString(profile?.sport) &&
    normalizedString(profile?.role),
  );
}

export function resolvePostAuthPath(
  profile: ProfileMe | null | undefined,
): RuntimePath {
  const accountType = getNormalizedAccountType(profile);

  if (!accountType) return RUNTIME_PATHS.chooseRole;
  if (accountType === "club") return RUNTIME_PATHS.clubProfile;
  if (!isAthleteProfileSufficient(profile)) return RUNTIME_PATHS.playerProfile;
  return RUNTIME_PATHS.feed;
}
