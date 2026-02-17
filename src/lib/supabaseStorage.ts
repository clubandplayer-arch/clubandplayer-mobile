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

export const secureStoreAdapter: SecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key, OPTIONS),
  setItem: (key, value) => {
    logSecureStoreWriteAudit(key, value, "supabaseStorage:secureStoreAdapter.setItem");
    return SecureStore.setItemAsync(key, value, OPTIONS);
  },
  removeItem: (key) => SecureStore.deleteItemAsync(key, OPTIONS),
};
