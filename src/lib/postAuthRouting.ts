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

export function resolvePostAuthPath(
  profile: ProfileMe | null | undefined,
): RuntimePath {
  const accountType = getNormalizedAccountType(profile);

  if (!accountType) return RUNTIME_PATHS.chooseRole;
  if (accountType === "club") return RUNTIME_PATHS.clubProfile;
  return RUNTIME_PATHS.playerProfile;
}
