// mybuddyai/services/apiClient.ts

let accessToken: string | null = null;

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

function normalizeBaseUrl(baseUrl: string): string {
  // Ensure a trailing slash so URL(relative, base) preserves any base path like `/api/`.
  // Example:
  //  baseUrl: https://example.com/api   -> https://example.com/api/
  //  join:   new URL('v1/foo', base)    -> https://example.com/api/v1/foo
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function resolveApiBaseUrl(): string {
  // Expo-friendly env var precedence:
  // EXPO_PUBLIC_API_BASE_URL (preferred)
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  return normalizeBaseUrl(baseUrl);
}

function isTruthyEnv(value: unknown): boolean {
  if (typeof value !== "string") return false;
  switch (value.trim().toLowerCase()) {
    case "1":
    case "true":
    case "yes":
      return true;
    default:
      return false;
  }
}

function getDebugApiEnabled(): boolean {
  return isTruthyEnv(process.env.EXPO_PUBLIC_DEBUG_API);
}

function safeErrorSummary(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const p = payload as any;
  const message =
    p?.details?.message ??
    p?.error ??
    p?.message;
  if (typeof message === "string") return message;
  return undefined;
}

function generateRequestId(): string {
  // Avoid node-only deps; this is for log correlation only.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiErrorPayload {
  error: string;
  details?: { message?: string } & Record<string, unknown>;
}

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload;

  constructor(status: number, payload?: ApiErrorPayload) {
    super(payload?.details?.message || payload?.error || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result as T;
  } finally {
    clearTimeout(timeoutId!);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const requestId = generateRequestId();
  const startedAt = Date.now();
  const debugApi = getDebugApiEnabled();

  const baseUrl = resolveApiBaseUrl();
  // IMPORTANT: use a relative join (no leading slash) so any base path prefix
  // like `/api/` is preserved.
  const url = new URL(`v1${path}`, baseUrl);

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const hasAuthHeader = Boolean(accessToken) || Boolean(headers["Authorization"]);
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const method = options.method ?? "GET";
  const fullUrl = url.toString();
  if (debugApi) {
    console.debug("[api] request", {
      requestId,
      method,
      url: fullUrl,
      hasAuthHeader,
    });
  }

  const res = await fetch(fullUrl, {
    method,
    headers,
    body:
      options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  if (debugApi) {
    console.debug("[api] response", {
      requestId,
      method,
      url: fullUrl,
      status: res.status,
    });
  }

  const text = await res.text();
  const hasBody = text.length > 0;

  let json: any = undefined;
  if (hasBody) {
    try {
      json = JSON.parse(text);
    } catch {
      // non-JSON response or empty; leave json as undefined
    }
  }

  const durationMs = Date.now() - startedAt;

  if (!res.ok) {
    if (debugApi) {
      console.debug("[api] error", {
        requestId,
        method,
        url: fullUrl,
        status: res.status,
        duration_ms: durationMs,
        summary: safeErrorSummary(json),
      });
    }

    if (res.status === 401) {
      if (unauthorizedHandler && debugApi) {
        console.debug("[api] 401 unauthorizedHandler fired", {
          requestId,
          method,
          url: fullUrl,
        });
      }
      unauthorizedHandler?.();
    }
    throw new ApiError(res.status, json);
  }

  if (debugApi) {
    console.debug("[api] success", {
      requestId,
      method,
      url: fullUrl,
      status: res.status,
      duration_ms: durationMs,
    });
  }

  return json as T;
}