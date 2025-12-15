import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { secureStorage } from "@/services/storage/secureStorage";
import { apiFetch } from "@/services/apiClient";
import {
  startKeycloakLoginAsync,
  KeycloakLoginResult,
} from "@/services/auth/keycloakAuth";
import { setAccessToken as setApiAccessToken, ApiError, setUnauthorizedHandler } from "@/services/apiClient";

type AuthUser = {
  sub: string;
  email?: string;
  name?: string;
};

type AuthContextValue = {
  loading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const USER_SUB_KEY = "auth_user_sub";
const USER_EMAIL_KEY = "auth_user_email";
const USER_NAME_KEY = "auth_user_name";

async function clearStoredSession() {
  await Promise.all([
    secureStorage.deleteItemAsync(ACCESS_TOKEN_KEY),
    secureStorage.deleteItemAsync(REFRESH_TOKEN_KEY),
    secureStorage.deleteItemAsync(USER_SUB_KEY),
    secureStorage.deleteItemAsync(USER_EMAIL_KEY),
    secureStorage.deleteItemAsync(USER_NAME_KEY),
  ]);
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const resetAuthState = useCallback(async () => {
    setAccessToken(null);
    setApiAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    await clearStoredSession();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // fire-and-forget; we don’t await in this callback
      resetAuthState().catch((err) => {
        console.error("[AuthContext] Error resetting auth on 401:", err);
      });
    });

    return () => setUnauthorizedHandler(null);
  }, [resetAuthState]);

  const validateSessionWithPing = useCallback(async () => {
    // Avoid network validation until we actually have a token.
    // During login (or first load) this prevents 401 loops resetting state.
    if (!accessToken) {
      console.log("[AuthContext] Skipping session validation: no accessToken");
      return;
    }

    try {
      // Lightweight authenticated endpoint.
      await apiFetch<unknown>("/me");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await resetAuthState();
      } else {
        console.warn("[AuthContext] Session validation failed (non-401):", err);
      }
    }
  }, [accessToken, resetAuthState]);

  useEffect(() => {
    async function loadStoredSession() {
      try {
        const [storedAccess, storedRefresh, sub, email, name] =
          await Promise.all([
            secureStorage.getItemAsync(ACCESS_TOKEN_KEY),
            secureStorage.getItemAsync(REFRESH_TOKEN_KEY),
            secureStorage.getItemAsync(USER_SUB_KEY),
            secureStorage.getItemAsync(USER_EMAIL_KEY),
            secureStorage.getItemAsync(USER_NAME_KEY),
          ]);

        if (storedAccess && sub) {
          setAccessToken(storedAccess);
          setApiAccessToken(storedAccess);
          setRefreshToken(storedRefresh ?? null);
          setUser({
            sub,
            email: email ?? undefined,
            name: name ?? undefined,
          });

          await validateSessionWithPing();
        }
      } finally {
        setLoading(false);
      }
    }

    loadStoredSession();
  }, [validateSessionWithPing]);

  const persistSession = useCallback(async (result: KeycloakLoginResult) => {
    console.log("[AuthContext] Persisting session:", {
      hasAccessToken: !!result.accessToken,
      hasRefreshToken: !!result.refreshToken,
      user: result.user,
    });

    setAccessToken(result.accessToken);
    setApiAccessToken(result.accessToken);
    setRefreshToken(result.refreshToken ?? null);
    setUser(result.user);

    await Promise.all([
      secureStorage.setItemAsync(ACCESS_TOKEN_KEY, result.accessToken),
      result.refreshToken
        ? secureStorage.setItemAsync(REFRESH_TOKEN_KEY, result.refreshToken)
        : secureStorage.deleteItemAsync(REFRESH_TOKEN_KEY),
      secureStorage.setItemAsync(USER_SUB_KEY, result.user.sub),
      result.user.email
        ? secureStorage.setItemAsync(USER_EMAIL_KEY, result.user.email)
        : secureStorage.deleteItemAsync(USER_EMAIL_KEY),
      result.user.name
        ? secureStorage.setItemAsync(USER_NAME_KEY, result.user.name)
        : secureStorage.deleteItemAsync(USER_NAME_KEY),
    ]);
  }, []);

  const login = useCallback(async () => {
    console.log("[AuthContext] login() called");

    // Disable the 401 reset handler during interactive login to avoid loops
    // if any background request fires while we don't have a token yet.
    setUnauthorizedHandler(null);

    try {
      const result = await startKeycloakLoginAsync();
      console.log("[AuthContext] login() result:", !!result);
      if (!result) return;
      await persistSession(result);
      console.log("[AuthContext] session persisted");
    } finally {
      setUnauthorizedHandler(() => {
        resetAuthState().catch((err) => {
          console.error("[AuthContext] Error resetting auth on 401:", err);
        });
      });
    }
  }, [persistSession, resetAuthState]);

  const logout = useCallback(async () => {
    await resetAuthState();
  }, [resetAuthState]);

  const value: AuthContextValue = {
    loading,
    isAuthenticated: !!accessToken,
    accessToken,
    refreshToken,
    user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}