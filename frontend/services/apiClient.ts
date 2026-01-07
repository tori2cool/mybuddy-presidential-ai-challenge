let accessToken: string | null = null;

type UnauthorizedHandler = (info?: { status: number; url: string; hasToken: boolean }) => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

type TokenRefresher = () => Promise<string | null>;
let tokenRefresher: TokenRefresher | null = null;

// Prevent multiple simultaneous refresh calls (stampede).
let refreshInFlight: Promise<string | null> | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// AuthContext sets this (ensureFreshToken)
export function setTokenRefresher(refresher: TokenRefresher | null) {
  tokenRefresher = refresher;
  refreshInFlight = null;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function resolveApiBaseUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  return normalizeBaseUrl(baseUrl);
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type QueryValue = string | number | boolean | undefined | null;

interface RequestOptions {
  method?: HttpMethod;
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  payload?: any;

  constructor(status: number, payload?: any) {
    super(payload?.details?.message || payload?.error || payload?.message || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const baseUrl = resolveApiBaseUrl();
  const normalizedPath = normalizePath(path);

  // NOTE: baseUrl already ends with "/", and URL() handles relative resolution.
  const url = new URL(`v1${normalizedPath}`, baseUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function isFormData(x: any): x is FormData {
  return typeof FormData !== "undefined" && x instanceof FormData;
}

function buildBody(body: unknown): { body?: BodyInit; contentType?: string } {
  if (body === undefined || body === null) return {};
  if (typeof body === "string") return { body };
  if (isFormData(body)) return { body }; // fetch sets multipart boundaries
  // You can extend here for Blob/ArrayBuffer if needed.
  return { body: JSON.stringify(body), contentType: "application/json" };
}

async function parseJsonSafe(res: Response) {
  if (res.status === 204) return undefined;

  const text = await res.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function doFetchOnce(fullUrl: string, options: RequestOptions, token: string | null) {
  const method = options.method ?? "GET";
  const { body, contentType } = buildBody(options.body);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  // Only set Content-Type when we actually have a JSON body (and not FormData)
  if (contentType && !headers["Content-Type"]) headers["Content-Type"] = contentType;

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(fullUrl, {
    method,
    headers,
    body,
    // Align web behavior with native and avoid surprises when the API uses cookies.
    // Safe for same-origin + cross-origin (requires server CORS allow-credentials if used).
    credentials: "include",
  });

  const json = await parseJsonSafe(res);
  return { res, json };
}

async function refreshTokenIfPossible(): Promise<string | null> {
  if (!tokenRefresher) return null;

  // Deduplicate concurrent refresh calls.
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const t = await tokenRefresher!();
        return t ?? null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const fullUrl = buildUrl(path, options.query);

  // Attempt #1 using current token (no proactive refresh here; avoid double-refresh + stampedes).
  let { res, json } = await doFetchOnce(fullUrl, options, accessToken);

  // If 401, attempt refresh + retry once.
  if (res.status === 401) {
    const newToken = await refreshTokenIfPossible();
    if (newToken) {
      accessToken = newToken;
      ({ res, json } = await doFetchOnce(fullUrl, options, accessToken));
    }
  }

  if (res.status === 401) {
    console.warn("[apiFetch] 401 Unauthorized", {
      url: fullUrl,
      hasToken: !!accessToken,
      payload: json,
    });

    // Avoid clearing tokens if the request raced auth bootstrap and we had no token yet.
    // Only trigger global unauthorized handling when we actually had a token.
    if (accessToken) {
      unauthorizedHandler?.({ status: 401, url: fullUrl, hasToken: true });
    }

    throw new ApiError(401, json);
  }

  if (!res.ok) {
    throw new ApiError(res.status, json);
  }

  // If endpoint returns 204 or empty body, json will be undefined.
  if (json === undefined) return undefined as T;

  return json as T;
}
