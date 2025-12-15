import { Platform } from "react-native";

// NOTE: this is a minimal runtime guard test.
// We don't run Jest in this repo today, but this file documents expectations
// and can be enabled later.

export function _computeWebRedirectUri(origin: string) {
  return `${origin}/auth/callback`;
}

export function _isWebPlatform() {
  return Platform.OS === "web";
}
