# Expo dev server behind a reverse proxy (nginx)

This repo’s frontend is an **Expo (SDK 54)** app.

When you access Expo Web via a **reverse proxy** (example: `https://mybuddy.suknet.org`), you can hit two common dev issues:

1. **Expo CLI CORS middleware blocks the request**
   - Error looks like:
     - `Error: Unauthorized request from https://mybuddy.suknet.org`
   - This comes from `@expo/cli` dev server CORS protection.

2. **Assets (fonts/images) return 500** when loaded from the proxied host
   - Example:
     - `/assets/?unstable_path=...Feather.ttf`
   - This usually happens because your reverse proxy routes `/assets` to your backend instead of the Expo dev server.

This document provides a development-friendly setup that:

- makes the Expo dev server generate URLs that match the external hostname
- proxies all Expo-specific paths to Expo (not your backend)

---

## 1) Start Expo for proxied web development

From `frontend/`:

### Option A (recommended): use the helper script + `.env`

Put your external hostname in `frontend/.env` (and optionally override locally via `frontend/.env.local`):

```bash
EXPO_PROXY_HOST=mybuddy.suknet.org
```

Then run:

```bash
npm run start:web:proxied
```

### Option B: set env vars manually

```bash
# Replace with your external hostname
export EXPO_PACKAGER_HOSTNAME=mybuddy.suknet.org
export REACT_NATIVE_PACKAGER_HOSTNAME=mybuddy.suknet.org

# Recommended: bind to all interfaces so nginx on the same host can reach it
npx expo start --web --host lan
```

Notes:

- `--host lan` makes the dev server listen in a way that works well behind a local reverse proxy.
- The `*_PACKAGER_HOSTNAME` vars ensure the dev server advertises the **external** hostname instead of `localhost`.

If you still get the **Unauthorized request** error, it’s usually because the dev server sees an `Origin`/`Host` it doesn’t trust. The nginx config below sets headers so Expo sees the expected `Host`.

---

## 2) Example nginx reverse proxy config

This is an **example** you can adapt.

Assumptions:

- Expo web dev server is on `http://127.0.0.1:8081` (Expo SDK 54 uses Metro for web)
- Metro bundler is on `http://127.0.0.1:8081`
- Your backend API is on `http://127.0.0.1:8000`

> Important: Expo web + its asset endpoints must be routed to the Expo web server (`8081`).

Create something like:

`/etc/nginx/sites-enabled/mybuddy-dev.conf`

```nginx
map $http_upgrade $connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 443 ssl;
  server_name mybuddy.suknet.org;

  # TLS config omitted for brevity

  # ----------------------------
  # Expo Web (HTML / JS / HMR)
  # ----------------------------
  location / {
    proxy_pass http://127.0.0.1:8081;

    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # WebSocket upgrade (HMR)
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
  }

  # ----------------------------
  # Expo asset endpoints
  # These MUST go to Expo, not backend.
  # ----------------------------
  location ^~ /assets/ {
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location ^~ /_expo/ {
    proxy_pass http://127.0.0.1:8081;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
  }

  # Some Expo Web builds use /react-refresh (HMR)
  location ^~ /react-refresh/ {
    proxy_pass http://127.0.0.1:8081;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
  }

  # ----------------------------
  # Metro bundler (web + native)
  # ----------------------------
  location ^~ /index.bundle {
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header Host $host;
  }

  location ^~ /symbolicate {
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header Host $host;
  }

  # ----------------------------
  # Backend API
  # ----------------------------
  location ^~ /api/ {
    proxy_pass http://127.0.0.1:8000/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  # If you have an auth callback that must hit the web app (not backend),
  # route it to Expo web as well.
  location = /auth/callback {
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

## 3) Why `/assets` must proxy to Expo

When the web app is served at `https://mybuddy.suknet.org`, the browser will request assets at the **same origin**, for example:

- `https://mybuddy.suknet.org/assets/?unstable_path=...Feather.ttf`

If nginx routes `/assets` to your backend, the backend will either 404 or 500 (because it does not know Expo’s asset query format).

So `/assets` (and related Expo endpoints like `/_expo/*`) must proxy to the Expo web dev server.

---

## 4) If you still see `Unauthorized request from https://…`

This usually means the Expo CLI dev server does not accept the incoming `Origin`/`Host`.

Things to verify:

- The nginx `proxy_set_header Host $host;` line is present for the Expo locations.
- You started Expo with:
  - `EXPO_PACKAGER_HOSTNAME=mybuddy.suknet.org`
  - `REACT_NATIVE_PACKAGER_HOSTNAME=mybuddy.suknet.org`
  - `npx expo start --web --host lan`

If the dev server is still strict in your CLI version, the practical workaround is to access the web app via the hostname Expo prints in the CLI output (or use `--tunnel`).
