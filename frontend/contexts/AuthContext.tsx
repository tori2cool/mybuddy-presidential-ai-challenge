import React, { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { secureStorage } from "@/services/storage/secureStorage";
import {
  startKeycloakLoginAsync,
  refreshAccessToken,
  decodeExp,
} from "@/services/auth/keycloakAuth";
import {
  setAccessToken as setApiAccessToken,
  setTokenRefresher,
  setUnauthorizedHandler,
} from "@/services/apiClient";

type AuthUser = {
  sub: string;
  email?: string;
  name?: string;
};

type AuthContextValue = {
  loading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  user: AuthUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_KEY = "auth_access";
const REFRESH_KEY = "auth_refresh";
const USER_KEY = "auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  async function persist(
    access: string,
    refresh: string | null,
    user: AuthUser,
  ) {
    setAccessToken(access);
    setRefreshToken(refresh);
    setUser(user);
    setApiAccessToken(access);

    await secureStorage.setItemAsync(ACCESS_KEY, access);
    if (refresh) await secureStorage.setItemAsync(REFRESH_KEY, refresh);
    await secureStorage.setItemAsync(USER_KEY, JSON.stringify(user));
  }

  async function clear() {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setApiAccessToken(null);
    await secureStorage.deleteItemAsync(ACCESS_KEY);
    await secureStorage.deleteItemAsync(REFRESH_KEY);
    await secureStorage.deleteItemAsync(USER_KEY);
  }

  async function ensureFreshToken(): Promise<string | null> {
    if (!accessToken || !refreshToken) return null;

    const exp = decodeExp(accessToken);
    const now = Math.floor(Date.now() / 1000);

    if (exp - now > 30) return accessToken;

    try {
      const refreshed = await refreshAccessToken(refreshToken);
      const decoded: any = jwtDecode(refreshed.accessToken);
      const user = {
        sub: decoded.sub,
        email: decoded.email,
        name: decoded.name,
      };
      await persist(refreshed.accessToken, refreshed.refreshToken, user);
      return refreshed.accessToken;
    } catch {
      await clear();
      return null;
    }
  }

  useEffect(() => {
    setTokenRefresher(ensureFreshToken);
    setUnauthorizedHandler((info) => {
      // Only clear when we were actually authenticated; prevents races during bootstrap.
      if (info?.hasToken) {
        console.warn("[AuthContext] Clearing auth due to 401", info);
        void clear();
      } else {
        console.warn("[AuthContext] 401 received without token (likely bootstrap race)", info);
      }
    });

    return () => {
      setTokenRefresher(null);
      setUnauthorizedHandler(null);
    };
  }, [accessToken, refreshToken]);

  useEffect(() => {
    (async () => {
      try {
        const [a, r, u] = await Promise.all([
          secureStorage.getItemAsync(ACCESS_KEY),
          secureStorage.getItemAsync(REFRESH_KEY),
          secureStorage.getItemAsync(USER_KEY),
        ]);
        if (a && u) {
          await persist(a, r, JSON.parse(u));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login() {
    const result = await startKeycloakLoginAsync();
    if (!result) return;
    await persist(result.accessToken, result.refreshToken ?? null, result.user);
  }

  async function logout() {
    await clear();
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        isAuthenticated: !!accessToken,
        accessToken,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
