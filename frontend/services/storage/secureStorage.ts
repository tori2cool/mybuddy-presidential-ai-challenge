import { Platform } from "react-native";

export type StorageLike = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

const memoryStore = new Map<string, string>();

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

async function getWebItemAsync(key: string): Promise<string | null> {
  if (hasLocalStorage()) {
    return window.localStorage.getItem(key);
  }
  return memoryStore.get(key) ?? null;
}

async function setWebItemAsync(key: string, value: string): Promise<void> {
  if (hasLocalStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }
  memoryStore.set(key, value);
}

async function deleteWebItemAsync(key: string): Promise<void> {
  if (hasLocalStorage()) {
    window.localStorage.removeItem(key);
    return;
  }
  memoryStore.delete(key);
}

async function getNativeSecureStore() {
  // IMPORTANT: avoid importing expo-secure-store on web.
  const mod = await import("expo-secure-store");
  return mod;
}

export const secureStorage: StorageLike = {
  async getItemAsync(key: string) {
    if (Platform.OS === "web") return getWebItemAsync(key);
    const SecureStore = await getNativeSecureStore();
    return SecureStore.getItemAsync(key);
  },

  async setItemAsync(key: string, value: string) {
    if (Platform.OS === "web") return setWebItemAsync(key, value);
    const SecureStore = await getNativeSecureStore();
    await SecureStore.setItemAsync(key, value);
  },

  async deleteItemAsync(key: string) {
    if (Platform.OS === "web") return deleteWebItemAsync(key);
    const SecureStore = await getNativeSecureStore();
    await SecureStore.deleteItemAsync(key);
  },
};
