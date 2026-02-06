import * as SecureStore from "expo-secure-store";

type SecureStoreAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export const secureStoreAdapter: SecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key, OPTIONS),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, OPTIONS),
  removeItem: (key) => SecureStore.deleteItemAsync(key, OPTIONS),
};
