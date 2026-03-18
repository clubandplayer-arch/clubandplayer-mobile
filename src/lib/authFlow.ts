import * as SecureStore from "expo-secure-store";
import type { ProfileMe, WhoamiResponse } from "./api";

const GUEST_ONBOARDING_KEY = "onboarding_seen";
const DASHBOARD_ONBOARDING_PREFIX = "dashboard_onboarding_seen:";

let cachedGuestOnboardingSeen: boolean | null = null;
const guestOnboardingListeners = new Set<(seen: boolean) => void>();

const dashboardOnboardingCache = new Map<string, boolean>();
const dashboardOnboardingListeners = new Set<(userId: string, seen: boolean) => void>();

export type AuthRole = "guest" | "club" | "athlete" | "unknown";

export type AuthBootstrapState = {
  role: AuthRole;
  accountType: string | null;
  shouldChooseRole: boolean;
  shouldCompleteAthleteProfile: boolean;
  shouldShowLoggedInOnboarding: boolean;
};

function normalize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function profileHasDisplayIdentity(profile: ProfileMe | null | undefined) {
  const fullName = typeof profile?.full_name === "string" ? profile.full_name.trim() : "";
  const displayName = typeof profile?.display_name === "string" ? profile.display_name.trim() : "";
  return fullName.length > 0 || displayName.length > 0;
}

export function getAccountTypeFromSources(whoami?: WhoamiResponse | null, profile?: ProfileMe | null): string | null {
  return normalize(profile?.account_type) ?? normalize(whoami?.profile && (whoami.profile as Record<string, unknown>)?.account_type) ?? normalize(whoami?.role);
}

export async function getGuestOnboardingSeen(): Promise<boolean> {
  if (cachedGuestOnboardingSeen !== null) return cachedGuestOnboardingSeen;
  const storedValue = await SecureStore.getItemAsync(GUEST_ONBOARDING_KEY);
  cachedGuestOnboardingSeen = storedValue === "true";
  return cachedGuestOnboardingSeen;
}

export async function setGuestOnboardingSeen(seen: boolean): Promise<void> {
  cachedGuestOnboardingSeen = seen;
  if (seen) await SecureStore.setItemAsync(GUEST_ONBOARDING_KEY, "true");
  else await SecureStore.deleteItemAsync(GUEST_ONBOARDING_KEY);
  guestOnboardingListeners.forEach((listener) => listener(seen));
}

export function subscribeGuestOnboardingSeen(listener: (seen: boolean) => void) {
  guestOnboardingListeners.add(listener);
  return () => guestOnboardingListeners.delete(listener);
}

function dashboardKey(userId: string) {
  return `${DASHBOARD_ONBOARDING_PREFIX}${userId}`;
}

export async function getDashboardOnboardingSeen(userId: string | null | undefined): Promise<boolean> {
  const normalizedUserId = typeof userId === "string" ? userId.trim() : "";
  if (!normalizedUserId) return false;
  if (dashboardOnboardingCache.has(normalizedUserId)) return dashboardOnboardingCache.get(normalizedUserId) === true;
  const storedValue = await SecureStore.getItemAsync(dashboardKey(normalizedUserId));
  const seen = storedValue === "true";
  dashboardOnboardingCache.set(normalizedUserId, seen);
  return seen;
}

export async function setDashboardOnboardingSeen(userId: string | null | undefined, seen: boolean): Promise<void> {
  const normalizedUserId = typeof userId === "string" ? userId.trim() : "";
  if (!normalizedUserId) return;
  dashboardOnboardingCache.set(normalizedUserId, seen);
  if (seen) await SecureStore.setItemAsync(dashboardKey(normalizedUserId), "true");
  else await SecureStore.deleteItemAsync(dashboardKey(normalizedUserId));
  dashboardOnboardingListeners.forEach((listener) => listener(normalizedUserId, seen));
}

export function subscribeDashboardOnboardingSeen(listener: (userId: string, seen: boolean) => void) {
  dashboardOnboardingListeners.add(listener);
  return () => dashboardOnboardingListeners.delete(listener);
}

export function getAuthBootstrapState(args: {
  whoami?: WhoamiResponse | null;
  profile?: ProfileMe | null;
  dashboardOnboardingSeen?: boolean;
}): AuthBootstrapState {
  const accountType = getAccountTypeFromSources(args.whoami ?? null, args.profile ?? null);
  const role: AuthRole = accountType === "club" ? "club" : accountType === "athlete" ? "athlete" : accountType ? "unknown" : "guest";
  const shouldChooseRole = !accountType;
  const shouldCompleteAthleteProfile = accountType === "athlete" && !profileHasDisplayIdentity(args.profile ?? null);
  const shouldShowLoggedInOnboarding = Boolean(accountType) && !shouldCompleteAthleteProfile && !args.dashboardOnboardingSeen;

  return {
    role,
    accountType,
    shouldChooseRole,
    shouldCompleteAthleteProfile,
    shouldShowLoggedInOnboarding,
  };
}
