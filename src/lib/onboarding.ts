import * as SecureStore from "expo-secure-store";

const ONBOARDING_KEY = "onboarding_seen";

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
    await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
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
