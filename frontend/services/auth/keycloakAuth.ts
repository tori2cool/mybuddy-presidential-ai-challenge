import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { jwtDecode } from "jwt-decode";

WebBrowser.maybeCompleteAuthSession();

export type KeycloakLoginResult = {
  accessToken: string;
  refreshToken?: string;
  user: { sub: string; email?: string; name?: string };
};

function getEnv() {
  const issuer = process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER!;
  const realm = process.env.EXPO_PUBLIC_KEYCLOAK_REALM!;
  const clientId = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID!;
  if (!issuer || !realm || !clientId) {
    throw new Error("Missing Keycloak env vars");
  }
  return { issuer, realm, clientId };
}

export function decodeExp(token: string): number {
  const d: any = jwtDecode(token);
  return d.exp;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const { issuer, realm, clientId } = getEnv();
  const tokenEndpoint = `${issuer}/realms/${realm}/protocol/openid-connect/token`;

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    throw new Error("Refresh failed");
  }

  const json: any = await res.json();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
  };
}

export async function startKeycloakLoginAsync(): Promise<KeycloakLoginResult | null> {
  const { issuer, realm, clientId } = getEnv();

  const redirectUri =
    Platform.OS === "web"
      ? `${window.location.origin}/auth/callback`
      : AuthSession.makeRedirectUri({ scheme: "mybuddy", path: "auth/callback" });

  const discovery = await AuthSession.fetchDiscoveryAsync(
    `${issuer}/realms/${realm}`,
  );

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: ["openid", "profile", "email", "offline_access"],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });

  const result = await request.promptAsync(discovery);

  if (result.type !== "success" || !result.params.code) {
    return null;
  }

  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      code: result.params.code,
      clientId,
      redirectUri,
      extraParams: {
        code_verifier: request.codeVerifier!,
      },
    },
    discovery,
  );

  const idToken = (tokenResponse as any).idToken;
  const decoded: any = idToken ? jwtDecode(idToken) : {};

  return {
    accessToken: tokenResponse.accessToken!,
    refreshToken: tokenResponse.refreshToken,
    user: {
      sub: decoded.sub,
      email: decoded.email,
      name: decoded.name,
    },
  };
}
