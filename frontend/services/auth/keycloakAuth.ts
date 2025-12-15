import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { jwtDecode } from "jwt-decode";

// Required on web so `openAuthSessionAsync`/`promptAsync` can resolve when the
// browser redirects back to this app.
// See: https://docs.expo.dev/versions/latest/sdk/webbrowser/#webbrowsermaybecompleteauthsession
WebBrowser.maybeCompleteAuthSession();

export type KeycloakLoginResult = {
  accessToken: string;
  refreshToken?: string;
  user: { sub: string; email?: string; name?: string };
};

export async function startKeycloakLoginAsync(): Promise<KeycloakLoginResult | null> {
  const issuer = process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER!;
  const realm = process.env.EXPO_PUBLIC_KEYCLOAK_REALM!;
  const clientId = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID!;

  if (Platform.OS === "web") {
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    console.log("[KeycloakAuth] web location at login start:", {
      currentPath,
      currentUrl,
    });
  }

  // Redirect URI must match Keycloak client configuration exactly.
  // - Native: use the app scheme (mybuddy://...) via makeRedirectUri.
  // - Web: use the current origin (https://...) + a fixed callback path.
  const redirectUri =
    Platform.OS === "web"
      ? `${window.location.origin}/auth/callback`
      : AuthSession.makeRedirectUri({
          scheme: "mybuddy",
          // Expo proxy helps for native during development; do NOT use proxy on web.
          useProxy: true,
          preferLocalhost: false,
        });

  // Guard: if we are *already* on the callback URL on web, don't automatically
  // start another auth session (prevents login loops if some code tries to auto-login).
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/auth/callback")
  ) {
    console.warn(
      "[KeycloakAuth] startKeycloakLoginAsync called while on /auth/callback; refusing to start a new session.",
      { href: window.location.href },
    );
    return null;
  }

  console.log("[KeycloakAuth] redirectUri:", redirectUri, {
    platform: Platform.OS,
    useProxy: Platform.OS === "web" ? false : true,
  });

  // Discover endpoints: { authorizationEndpoint, tokenEndpoint, ... }
  const discovery = await AuthSession.fetchDiscoveryAsync(
    `${issuer}/realms/${realm}`,
  );

  console.log("[KeycloakAuth] discovery endpoints:", {
    authorizationEndpoint: discovery.authorizationEndpoint,
    tokenEndpoint: discovery.tokenEndpoint,
    revocationEndpoint: discovery.revocationEndpoint,
    endSessionEndpoint: (discovery as any).endSessionEndpoint,
    issuer,
    realm,
  });

  if (!discovery.authorizationEndpoint) {
    console.error(
      "[KeycloakAuth] discovery.authorizationEndpoint is undefined. Check EXPO_PUBLIC_KEYCLOAK_ISSUER/REALM and that the realm URL is reachable:",
      `${issuer}/realms/${realm}`,
    );
    return null;
  }

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: ["openid", "profile", "email"],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });

  const authUrl = await request.makeAuthUrlAsync(discovery);

  console.log("[KeycloakAuth] generated authUrl:", authUrl);

  // NOTE: expo-auth-session@7 removed AuthSession.startAsync.
  // Web flow uses request.promptAsync when possible, otherwise falls back to
  // expo-web-browser openAuthSessionAsync and parsing the redirect.
  const result = await (async () => {
    if (Platform.OS !== "web") {
      return request.promptAsync(discovery, {
        useProxy: true,
        // Native: use ephemeral session where supported.
        preferEphemeralSession: true,
      });
    }

    // Web: try promptAsync first.
    try {
      const promptAsync: any = (request as any).promptAsync;
      if (typeof promptAsync === "function") {
        // Some versions accept an explicit URL override.
        return await promptAsync.call(request, discovery, { url: authUrl });
      }
    } catch (err) {
      console.warn("[KeycloakAuth] web promptAsync failed, falling back:", err);
    }

    const browserResult = await WebBrowser.openAuthSessionAsync(
      authUrl,
      redirectUri,
    );

    console.log("[KeycloakAuth] openAuthSessionAsync result:", browserResult);

    if (browserResult.type !== "success" || !browserResult.url) {
      return { type: browserResult.type, params: {} } as any;
    }

    const parsed = AuthSession.parseReturnUrl(browserResult.url);
    console.log("[KeycloakAuth] parseReturnUrl:", {
      url: browserResult.url,
      type: parsed.type,
      hasParams: !!parsed.params,
      paramKeys: Object.keys(parsed.params ?? {}),
      errorCode: (parsed as any).errorCode,
    });

    return {
      type: "success",
      params: parsed.params ?? {},
    } as any;
  })();

  console.log("[KeycloakAuth] prompt result:", {
    type: result.type,
    params: result.type === "success" ? Object.keys(result.params ?? {}) : null,
    errorCode: (result as any).errorCode,
  });

  if (result.type !== "success" || !result.params.code) {
    console.log("[KeycloakAuth] Login not successful", {
      type: result.type,
      // Common on web when popup is blocked or user closes it.
      hint:
        Platform.OS === "web"
          ? "If you see {type:'dismiss'} on web, ensure Keycloak Valid Redirect URIs & Web Origins match this app's URL and that popups aren't blocked."
          : undefined,
    });
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