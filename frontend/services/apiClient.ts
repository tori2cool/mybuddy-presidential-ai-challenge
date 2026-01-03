// mybuddyai/services/apiClient.ts (drop-in replacement)

let accessToken: string | null = null;

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

type TokenRefresher = () => Promise<string | null>;
let tokenRefresher: TokenRefresher | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// AuthContext sets this (ensureFreshToken)
export function setTokenRefresher(refresher: TokenRefresher | null) {
  tokenRefresher = refresher;
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

interface RequestOptions {
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | undefined>;
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

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const baseUrl = resolveApiBaseUrl();
  const url = new URL(`v1${path}`, baseUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function buildBody(body: unknown): { body?: string; contentType?: string } {
  if (body === undefined || body === null) return {};
  if (typeof body === "string") return { body };
  // objects/arrays/numbers/etc -> JSON
  return { body: JSON.stringify(body), contentType: "application/json" };
}

async function parseJsonSafe(res: Response) {
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
    ...(options.headers || {}),
  };

  // Only set Content-Type when we actually have a JSON body
  if (contentType && !headers["Content-Type"]) headers["Content-Type"] = contentType;

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(fullUrl, {
    method,
    headers,
    body,
  });

  const json = await parseJsonSafe(res);
  return { res, json };
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const fullUrl = buildUrl(path, options.query);

  // If we have a refresher and we are about to make an authed request, refresh proactively.
  // (Simple: call refresher whenever we currently have a token.)
  if (tokenRefresher && accessToken) {
    const maybeFresh = await tokenRefresher();
    if (maybeFresh) {
      accessToken = maybeFresh;
    }
  }

  // Attempt #1
  let { res, json } = await doFetchOnce(fullUrl, options, accessToken);

  // If 401, attempt refresh + retry once
  if (res.status === 401 && tokenRefresher) {
    const newToken = await tokenRefresher();
    if (newToken) {
      accessToken = newToken;
      ({ res, json } = await doFetchOnce(fullUrl, options, accessToken));
    }
  }

  if (res.status === 401) {
    unauthorizedHandler?.();
    throw new ApiError(401, json);
  }

  if (!res.ok) {
    throw new ApiError(res.status, json);
  }

  return json as T;
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}
