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

  const candidate = { ...parsed } as Record<string, unknown>;

  // Keep auth/session shape intact as much as possible; drop only clearly optional large fields.
  delete candidate.provider_token;
  delete candidate.provider_refresh_token;

  const session = candidate.session;
  if (session && typeof session === "object" && !Array.isArray(session)) {
    const sessionObj = { ...(session as Record<string, unknown>) };
    delete sessionObj.provider_token;
    delete sessionObj.provider_refresh_token;
    candidate.session = sessionObj;
  }

  const firstPass = JSON.stringify(candidate);
  if (new TextEncoder().encode(firstPass).length < 2048) {
    return firstPass;
  }

  // Last resort: reduce oversized user metadata, but preserve id/email for bootstrap logic.
  const user = candidate.user;
  if (user && typeof user === "object" && !Array.isArray(user)) {
    const userObj = user as Record<string, unknown>;
    const reducedUser: Record<string, unknown> = {};
    if (typeof userObj.id === "string") reducedUser.id = userObj.id;
    if (typeof userObj.email === "string") reducedUser.email = userObj.email;
    candidate.user = reducedUser;
  }

  const secondPass = JSON.stringify(candidate);
  if (new TextEncoder().encode(secondPass).length < 2048) {
    return secondPass;
  }

  return null;
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
