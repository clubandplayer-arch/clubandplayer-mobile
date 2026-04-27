import * as SecureStore from "expo-secure-store";

type SecureStoreAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

const TOKEN_FIELDS = [
  "access_token",
  "refresh_token",
  "provider_token",
  "provider_refresh_token",
];

function logSecureStoreWriteAudit(
  key: string,
  value: string,
  callsite: string
): void {
  if (!__DEV__) {
    return;
  }

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
    key,
    bytes,
    callsite,
    topKeys,
    lens,
  });
}

function minimizeOversizedAuthTokenValue(key: string, value: string): string | null {
  const isAuthTokenKey = key.includes("-auth-token") || key.endsWith("-auth-token");
  if (!isAuthTokenKey) {
    return null;
  }

  const bytesOriginal = new TextEncoder().encode(value).length;
  if (bytesOriginal <= 2048) {
    return null;
  }

  let parsed: Record<string, unknown>;
  try {
    const candidate = JSON.parse(value);
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return null;
    }
    parsed = candidate as Record<string, unknown>;
  } catch {
    return null;
  }

  const user = parsed.user;
  if (!user || typeof user !== "object" || Array.isArray(user)) {
    return null;
  }

  // Keep the original session shape intact and only strip known bulky optional data.
  // Supabase may invalidate the stored session if required user fields are missing.
  const normalized: Record<string, unknown> = {
    ...parsed,
    user: { ...(user as Record<string, unknown>) },
  };

  const normalizedUser = normalized.user as Record<string, unknown>;
  const maybeKeysToDrop = ["identities", "factors"];
  let changed = false;
  for (const keyToDrop of maybeKeysToDrop) {
    if (keyToDrop in normalizedUser) {
      delete normalizedUser[keyToDrop];
      changed = true;
    }
  }

  if (!changed) {
    return null;
  }

  const minValue = JSON.stringify(normalized);
  const bytesMin = new TextEncoder().encode(minValue).length;
  return bytesMin < 2048 ? minValue : null;
}

export const secureStoreAdapter: SecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key, OPTIONS),
  setItem: (key, value) => {
    logSecureStoreWriteAudit(key, value, "supabaseStorage:secureStoreAdapter.setItem");

    const bytesOriginal = new TextEncoder().encode(value).length;
    if (!__DEV__ || bytesOriginal <= 2048) {
      return SecureStore.setItemAsync(key, value, OPTIONS);
    }

    const minimizedValue = minimizeOversizedAuthTokenValue(key, value);
    if (minimizedValue !== null) {
      if (__DEV__) {
        const bytesTrimmed = new TextEncoder().encode(minimizedValue).length;
        console.log("[PR-M2][SecureStore:trim]", {
          key,
          bytesOriginal,
          bytesTrimmed,
        });
      }
      return SecureStore.setItemAsync(key, minimizedValue, OPTIONS);
    }

    if (__DEV__ && (key.includes("-auth-token") || key.endsWith("-auth-token"))) {
      console.log("[PR-M2][SecureStore:trim-failed]", {
        key,
        bytesOriginal,
      });
    }

    return SecureStore.setItemAsync(key, value, OPTIONS);
  },
  removeItem: (key) => SecureStore.deleteItemAsync(key, OPTIONS),
};
