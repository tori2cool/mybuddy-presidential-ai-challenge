import * as AuthSession from "expo-auth-session";
import { jwtDecode } from "jwt-decode";

export type KeycloakLoginResult = {
  accessToken: string;
  refreshToken?: string;
  user: { sub: string; email?: string; name?: string };
};

export async function startKeycloakLoginAsync(): Promise<KeycloakLoginResult | null> {
  const issuer = process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER!;
  const realm = process.env.EXPO_PUBLIC_KEYCLOAK_REALM!;
  const clientId = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID!;

  const redirectUri = AuthSession.makeRedirectUri({
    useProxy: true,
    preferLocalhost: false,
  });

  console.log("[KeycloakAuth] Using redirectUri:", redirectUri);

  // Discover endpoints: { authorizationEndpoint, tokenEndpoint, ... }
  const discovery = await AuthSession.fetchDiscoveryAsync(
    `${issuer}/realms/${realm}`,
  );

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: ["openid", "profile", "email"],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });

  await request.makeAuthUrlAsync(discovery);

  const result = await request.promptAsync(discovery, {
    useProxy: true,
  });

  console.log("[KeycloakAuth] prompt result:", result);

  if (result.type !== "success" || !result.params.code) {
    console.log("[KeycloakAuth] Login not successful, type:", result.type);
    return null;
  }

  try {
    const code = result.params.code;

    const tokenResponse = await AuthSession.exchangeCodeAsync(
      {
        code,
        redirectUri,
        clientId,
        extraParams: {
          grant_type: "authorization_code",
          code_verifier: request.codeVerifier ?? "",
        },
      },
      discovery,
    );

    console.log("[KeycloakAuth] tokenResponse:", {
      hasAccessToken: !!tokenResponse.accessToken,
      hasRefreshToken: !!tokenResponse.refreshToken,
      hasIdToken: !!(tokenResponse as any).idToken,
    });

    const accessToken = tokenResponse.accessToken!;
    const refreshToken = tokenResponse.refreshToken;
    const idToken = (tokenResponse as any).idToken as string | undefined;

    let user: { sub: string; email?: string; name?: string } = { sub: "" };

    if (idToken) {
      const decoded: any = jwtDecode(idToken);
      user = {
        sub: decoded.sub,
        email: decoded.email,
        name: decoded.name,
      };
    }

    return { accessToken, refreshToken, user };
  } catch (e) {
    console.log("[KeycloakAuth] exchangeCodeAsync error:", e);
    return null;
  }
}