import { Platform } from "react-native";
import { secureStorage } from "./secureStorage";

// Minimal runtime check (executed only if imported) to ensure web doesn't crash
// due to native SecureStore APIs.
export async function secureStorageRuntimeCheck(): Promise<boolean> {
  const key = "__mybuddy_secure_storage_check__";
  const value = `ok-${Date.now()}`;

  try {
    await secureStorage.setItemAsync(key, value);
    const read = await secureStorage.getItemAsync(key);
    await secureStorage.deleteItemAsync(key);

    const ok = read === value;
    if (!ok) {
      console.warn("[secureStorageRuntimeCheck] mismatch", {
        platform: Platform.OS,
        expected: value,
        got: read,
      });
    }
    return ok;
  } catch (err) {
    console.error("[secureStorageRuntimeCheck] error", {
      platform: Platform.OS,
      err,
    });
    return false;
  }
}
