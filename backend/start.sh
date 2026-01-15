#!/usr/bin/env bash
set -Eeuo pipefail

# Run from within backend/
if [[ ! -f "./docker-compose.yml" ]]; then
  echo "ERROR: start_local.sh must be run from within the backend/ directory" >&2
  exit 1
fi

# ---------------------------
# Load .env (export all vars)
# ---------------------------
if [[ -f "./.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "./.env"
  set +a
else
  echo "ERROR: backend/.env not found (required)" >&2
  exit 1
fi

# Basic required envs for DB readiness checks
: "${POSTGRES_USER:?POSTGRES_USER must be set in .env}"
: "${POSTGRES_DB:?POSTGRES_DB must be set in .env}"

# Compose wrapper (supports docker compose v2 and docker-compose v1)
#
# NOTE: docker-compose v1.29.2 (python) can error during container recreate
# with: KeyError: 'ContainerConfig' when stale/orphaned containers/images exist.
# To keep startup reliable on legacy hosts, we do a project-scoped cleanup
# (down --remove-orphans) before bringing infra up.
dc() {
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    docker compose "$@"
  fi
}

# ---------------------------
# Start infra (Docker)
# ---------------------------
echo "Starting db + redis via docker compose..."
# Use the infra-only compose file to avoid unsupported keys (e.g. `develop:`)
# on older docker compose / docker-compose versions.
#
# Also proactively remove old/orphaned containers to avoid docker-compose v1
# recreate crash (KeyError: 'ContainerConfig').
dc -f docker-compose.infra.yml down --remove-orphans

dc -f docker-compose.infra.yml up -d --force-recreate db redis

echo "Waiting for Postgres to become ready..."
# Wait until pg_isready returns success
for _ in $(seq 1 60); do
  if docker exec app-db pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Confirm auth + query works
for _ in $(seq 1 60); do
  if docker exec -e PGPASSWORD="${POSTGRES_PASS:-}" app-db \
    psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "SELECT 1" >/dev/null 2>&1; then
    echo "Postgres ready."
    break
  fi
  sleep 1
done

# Final check (fail hard if not ready)
docker exec app-db pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null
docker exec -e PGPASSWORD="${POSTGRES_PASS:-}" app-db \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "SELECT 1" >/dev/null

# ---------------------------
# Wait for Redis to become ready
# ---------------------------
echo "Waiting for Redis to become ready..."
# Wait until redis-cli ping returns PONG
for _ in $(seq 1 60); do
  if docker exec app-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo "Redis ready."
    break
  fi
  sleep 1
done

# Final check (fail hard if not ready)
docker exec app-redis redis-cli ping 2>/dev/null | grep -q "PONG"

# ---------------------------
# Python venv + deps
# ---------------------------
if [[ ! -d ".venv" ]]; then
  echo "Creating .venv..."
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

# Install deps if needed
if ! python -c "import fastapi, uvicorn, celery" >/dev/null 2>&1; then
  echo "Installing Python dependencies..."
  pip install --upgrade pip >/dev/null
  pip install -r requirements.txt
fi

# ---------------------------
# Local env overrides
# ---------------------------
rewrite_host() {
  # $1 = url, $2 = from_host, $3 = to_host
  # Replace only the first occurrence of from_host in the authority component.
  local url="$1"
  local from="$2"
  local to="$3"

  # Handles:
  # - scheme://user:pass@host:port/db
  # - scheme://host:port/db
  # - redis://host:port/0
  echo "${url}" | sed -E "s#(://[^/@]*@?)${from}([:/])#\\1${to}\\2#"
}

if [[ -n "${DATABASE_URL:-}" ]]; then
  export DATABASE_URL
  DATABASE_URL="$(rewrite_host "${DATABASE_URL}" "db" "localhost")"
fi

for var in REDIS_URL CELERY_BROKER_URL CELERY_RESULT_BACKEND; do
  if [[ -n "${!var:-}" ]]; then
    export "$var"="$(rewrite_host "${!var}" "redis" "localhost")"
  fi
done

export ENVIRONMENT="local"

# ---------------------------
# Process management
# ---------------------------
PIDS=()
BEAT_SCHEDULE_FILE="${BEAT_SCHEDULE_FILE:-./.celerybeat-schedule}"

kill_group() {
  # Kill an entire process group (PGID == PID when started with setsid)
  local pid="$1"
  if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
    kill -- "-${pid}" >/dev/null 2>&1 || true
  fi
}

cleanup() {
  set +e
  echo "Shutting down..."

  # Graceful stop (whole groups)
  for pid in "${PIDS[@]:-}"; do
    kill_group "${pid}"
  done

  # Give them a moment, then force kill if needed
  sleep 2
  for pid in "${PIDS[@]:-}"; do
    if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
      kill -9 -- "-${pid}" >/dev/null 2>&1 || true
    fi
  done
}
trap cleanup EXIT INT TERM

# ---------------------------
# Preflight: kill stale celery/beat (dev-scope)
# ---------------------------
echo "Killing any stale celery worker/beat for this app (if any)..."
pkill -f "celery -A app.celery_app.celery_app worker" >/dev/null 2>&1 || true
pkill -f "celery -A app.celery_app.celery_app beat" >/dev/null 2>&1 || true
# Some systems show 'ForkPoolWorker-*' as separate processes; killing the parent
# worker group is usually enough, but this helps if a child got orphaned.
pkill -f "celery.*ForkPoolWorker" >/dev/null 2>&1 || true

# Beat schedule file can cause confusing behavior between runs
rm -f "${BEAT_SCHEDULE_FILE}" "${BEAT_SCHEDULE_FILE}.db" 2>/dev/null || true

# ---------------------------
# Run processes
# ---------------------------
echo "Starting celery worker..."
# Start in a new session/process group so we can kill the whole tree on exit.
setsid celery -A app.celery_app.celery_app worker --loglevel=INFO &
PIDS+=("$!")

echo "Starting celery beat..."
setsid celery -A app.celery_app.celery_app beat --loglevel=INFO --schedule="${BEAT_SCHEDULE_FILE}" &
PIDS+=("$!")

echo "Active celery processes:"
pgrep -af "celery -A app.celery_app.celery_app (worker|beat)" || true

echo "Starting uvicorn (reload) in foreground..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
