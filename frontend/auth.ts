import * as AuthSession from "expo-auth-session";

const KEYCLOAK_URL =
  "https://sso.idanow.org/realms/mybuddy/protocol/openid-connect/auth";

const CLIENT_ID = "mybuddy.com";

export const redirectUri = AuthSession.makeRedirectUri({
  scheme: "mybuddy",
  path: "auth/callback",
});

export const discovery = {
  authorizationEndpoint: KEYCLOAK_URL,
};

export function buildAuthRequest() {
  return new AuthSession.AuthRequest({
    clientId: CLIENT_ID,
    responseType: AuthSession.ResponseType.Code,
    scopes: ["openid", "profile", "email", "offline_access"],
    redirectUri,
    usePKCE: true,
  });
}
