import * as SecureStore from "expo-secure-store";

const ONBOARDING_KEY = "onboarding_seen";
const TOKEN_FIELDS = [
  "access_token",
  "refresh_token",
  "provider_token",
  "provider_refresh_token",
];

let cachedOnboardingSeen: boolean | null = null;
const onboardingListeners = new Set<(seen: boolean) => void>();

export async function getOnboardingSeen(): Promise<boolean> {
  if (cachedOnboardingSeen !== null) {
    return cachedOnboardingSeen;
  }

  const storedValue = await SecureStore.getItemAsync(ONBOARDING_KEY);
  cachedOnboardingSeen = storedValue === "true";
  return cachedOnboardingSeen;
}

export async function setOnboardingSeen(seen: boolean): Promise<void> {
  cachedOnboardingSeen = seen;

  if (seen) {
    const value = "true";

    if (__DEV__) {
      const bytes = new TextEncoder().encode(value).length;
      let topKeys: string[] | null = null;
      const lens: Record<string, number> = {};

      try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        topKeys = Object.keys(parsed);

        TOKEN_FIELDS.forEach((field) => {
          const fieldValue = parsed[field];
          if (typeof fieldValue === "string") {
            lens[field] = fieldValue.length;
          }
        });

        const session = parsed.session;
        if (session && typeof session === "object") {
          TOKEN_FIELDS.forEach((field) => {
            const fieldValue = (session as Record<string, unknown>)[field];
            if (typeof fieldValue === "string") {
              lens[`session.${field}`] = fieldValue.length;
            }
          });
        }
      } catch {
        // Non-JSON payload, nothing else to log.
      }

      console.log("[PR-M2][SecureStore:set]", {
        key: ONBOARDING_KEY,
        bytes,
        callsite: "onboarding:setOnboardingSeen",
        topKeys,
        lens,
      });
    }

    await SecureStore.setItemAsync(ONBOARDING_KEY, value);
  } else {
    await SecureStore.deleteItemAsync(ONBOARDING_KEY);
  }

  onboardingListeners.forEach((listener) => listener(seen));
}

export function subscribeOnboardingSeen(
  listener: (seen: boolean) => void
): () => void {
  onboardingListeners.add(listener);
  return () => {
    onboardingListeners.delete(listener);
  };
}
