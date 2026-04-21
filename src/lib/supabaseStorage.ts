import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

function isSupabaseAuthStorageKey(key: string): boolean {
  return key.startsWith("sb-") && (key.includes("-auth-token") || key.includes("-code-verifier"));
}

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
  getItem: async (key) => {
    if (!isSupabaseAuthStorageKey(key)) {
      return SecureStore.getItemAsync(key, OPTIONS);
    }

    const asyncValue = await AsyncStorage.getItem(key);
    if (asyncValue != null) {
      return asyncValue;
    }

    // One-way migration fallback from previous SecureStore auth persistence.
    const legacySecureValue = await SecureStore.getItemAsync(key, OPTIONS);
    if (legacySecureValue != null) {
      await AsyncStorage.setItem(key, legacySecureValue);
      await SecureStore.deleteItemAsync(key, OPTIONS);
      if (__DEV__) {
        console.log("[PR-M2][supabaseStorage:migrated-to-async]", { key });
      }
    }

    return legacySecureValue;
  },
  setItem: (key, value) => {
    logSecureStoreWriteAudit(key, value, "supabaseStorage:secureStoreAdapter.setItem");

    const bytesOriginal = new TextEncoder().encode(value).length;
    if (__DEV__ && bytesOriginal > 2048 && (key.includes("-auth-token") || key.endsWith("-auth-token"))) {
      console.log("[PR-M2][SecureStore:oversized-auth-token]", {
        key,
        bytesOriginal,
      });
    }

    if (isSupabaseAuthStorageKey(key)) {
      return AsyncStorage.setItem(key, value);
    }

    return SecureStore.setItemAsync(key, value, OPTIONS);
  },
  removeItem: async (key) => {
    if (isSupabaseAuthStorageKey(key)) {
      await AsyncStorage.removeItem(key);
      await SecureStore.deleteItemAsync(key, OPTIONS);
      return;
    }
    await SecureStore.deleteItemAsync(key, OPTIONS);
  },
};
