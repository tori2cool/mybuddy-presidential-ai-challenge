#!/usr/bin/env node
/**
 * Dev helper: start Expo Web behind a reverse proxy.
 *
 * This is intentionally lightweight: it only prints/sets env that Expo CLI reads
 * and then execs `npx expo start --web --host lan`.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';

// Ensure Node process sees vars from frontend/.env (and optionally .env.local)
// before we read process.env.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

const envPath = path.join(frontendDir, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const envLocalPath = path.join(frontendDir, '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

const externalHost = process.env.EXPO_PROXY_HOST || process.env.EXPO_PACKAGER_HOSTNAME;

const expoWebPort = Number(process.env.EXPO_WEB_PORT || process.env.EXPO_DEV_PORT) || 8081;

if (!externalHost) {
  console.error(
    [
      'Missing external hostname.',
      '',
      'Set EXPO_PROXY_HOST (recommended) or EXPO_PACKAGER_HOSTNAME, e.g.:',
      '  EXPO_PROXY_HOST=mybuddy.suknet.org npm run start:web:proxied',
      '',
      'See: frontend/docs/DEV_PROXY.md',
    ].join('\n')
  );
  process.exit(1);
}

const env = {
  ...process.env,
  EXPO_PACKAGER_HOSTNAME: externalHost,
  REACT_NATIVE_PACKAGER_HOSTNAME: externalHost,
};

console.log(
  [
    'Starting Expo Web for reverse-proxy development',
    `  external host: ${externalHost}`,
    `  expo web dev server: http://127.0.0.1:${expoWebPort}`,
    '  metro (native):      http://127.0.0.1:8081',
    '',
    `nginx must proxy at minimum: /, /assets/, /_expo/, /react-refresh/ -> ${expoWebPort}`,
    'Docs: frontend/docs/DEV_PROXY.md',
    '',
  ].join('\n')
);

const child = spawn('npx', ['expo', 'start', '--web', '--host', 'lan'], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
