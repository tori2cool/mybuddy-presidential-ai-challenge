#!/usr/bin/env bash
set -Eeuo pipefail

# Run from within backend/
if [[ ! -f "./docker-compose.yml" ]]; then
  echo "ERROR: start.sh must be run from within the backend/ directory" >&2
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

# ---------------------------
# Guardrails: local-run expects localhost endpoints
# ---------------------------
if [[ "${DATABASE_URL:-}" == *"@db:"* ]] || [[ "${DATABASE_URL:-}" == *"@db/"* ]]; then
  echo "ERROR: DATABASE_URL points at Docker hostname 'db' but this script runs API/celery on the host." >&2
  echo "Fix .env to use 127.0.0.1 (e.g. postgresql+asyncpg://user:pass@127.0.0.1:5432/dbname)" >&2
  exit 1
fi
if [[ "${REDIS_URL:-}" == *"redis://redis:"* ]] || [[ "${CELERY_BROKER_URL:-}" == *"redis://redis:"* ]]; then
  echo "ERROR: REDIS_URL/CELERY_BROKER_URL points at Docker hostname 'redis' but this script runs celery on the host." >&2
  echo "Fix .env to use 127.0.0.1 (e.g. redis://127.0.0.1:6379/0)" >&2
  exit 1
fi

# Basic required envs for DB readiness checks
: "${POSTGRES_USER:?POSTGRES_USER must be set in .env}"
: "${POSTGRES_DB:?POSTGRES_DB must be set in .env}"

# ---------------------------
# Start infra (Docker)
# ---------------------------
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker does not seem to be running (docker info failed)." >&2
  exit 1
fi

echo "Starting Docker infra (db + redis)..."
docker compose up -d db redis

# Ensure expected container names exist (compose uses container_name)
if ! docker ps --format '{{.Names}}' | grep -qx 'app-db'; then
  echo "ERROR: Expected container 'app-db' not running. Check docker compose logs db." >&2
  docker compose ps || true
  docker compose logs --tail=200 db || true
  exit 1
fi
if ! docker ps --format '{{.Names}}' | grep -qx 'app-redis'; then
  echo "ERROR: Expected container 'app-redis' not running. Check docker compose logs redis." >&2
  docker compose ps || true
  docker compose logs --tail=200 redis || true
  exit 1
fi

# ---------------------------
# Wait for Postgres to become ready
# ---------------------------
echo "Waiting for Postgres to become ready..."
for _ in $(seq 1 60); do
  if docker exec app-db pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

for _ in $(seq 1 60); do
  if docker exec -e PGPASSWORD="${POSTGRES_PASS:-}" app-db \
    psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "SELECT 1" >/dev/null 2>&1; then
    echo "Postgres ready."
    break
  fi
  sleep 1
done

# Final check (fail hard)
docker exec app-db pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null
docker exec -e PGPASSWORD="${POSTGRES_PASS:-}" app-db \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "SELECT 1" >/dev/null

# ---------------------------
# Wait for Redis to become ready
# ---------------------------
echo "Waiting for Redis to become ready..."
for _ in $(seq 1 60); do
  if docker exec app-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo "Redis ready."
    break
  fi
  sleep 1
done

# Final check (fail hard)
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

if ! python -c "import fastapi, uvicorn, celery" >/dev/null 2>&1; then
  echo "Installing Python dependencies..."
  pip install --upgrade pip >/dev/null
  pip install -r requirements.txt
fi

# ---------------------------
# Logging
# ---------------------------
export MYBUDDY_LOG_DIR="${MYBUDDY_LOG_DIR:-./logs}"
mkdir -p "${MYBUDDY_LOG_DIR}"

# ---------------------------
# Process management
# ---------------------------
PIDS=()
BEAT_SCHEDULE_FILE="${BEAT_SCHEDULE_FILE:-./.celerybeat-schedule}"

kill_pgid() {
  local pid="$1"
  [[ -n "${pid}" ]] || return 0

  # Only act if still running
  if kill -0 "${pid}" >/dev/null 2>&1; then
    # Kill the whole process group for this PID
    # (negative PID => process group)
    kill -TERM -- "-${pid}" >/dev/null 2>&1 || true
  fi
}

force_kill_pgid() {
  local pid="$1"
  [[ -n "${pid}" ]] || return 0
  if kill -0 "${pid}" >/dev/null 2>&1; then
    kill -KILL -- "-${pid}" >/dev/null 2>&1 || true
  fi
}

cleanup() {
  set +e
  echo
  echo "Shutting down..."

  # Graceful stop (groups)
  for pid in "${PIDS[@]:-}"; do
    kill_pgid "${pid}"
  done

  # Wait a bit for graceful shutdown
  local deadline=$((SECONDS + 8))
  while (( SECONDS < deadline )); do
    local any=0
    for pid in "${PIDS[@]:-}"; do
      if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
        any=1
        break
      fi
    done
    (( any == 0 )) && break
    sleep 0.2
  done

  # Force kill any stragglers
  for pid in "${PIDS[@]:-}"; do
    force_kill_pgid "${pid}"
  done

  # Reap children to avoid zombies
  for pid in "${PIDS[@]:-}"; do
    wait "${pid}" 2>/dev/null || true
  done
}

# Trap INT/TERM so Ctrl+C triggers cleanup immediately,
# and EXIT so normal exit cleans up too.
trap cleanup INT TERM EXIT

# ---------------------------
# Run processes
# ---------------------------
echo "Starting celery worker..."
# Start in a new process group WITHOUT detaching into a new session.
# Using bash job control tricks: start, then put it in its own pgid via set -m + command grouping.
(
  set -m
  export MYBUDDY_LOG_TARGET="celery"
  celery -A app.celery_app.celery_app worker --loglevel=INFO
) &
PIDS+=("$!")

echo "Starting celery beat..."
(
  set -m
  export MYBUDDY_LOG_TARGET="beat"
  celery -A app.celery_app.celery_app beat --loglevel=INFO --schedule="${BEAT_SCHEDULE_FILE}"
) &
PIDS+=("$!")

echo "Active celery processes:"
pgrep -af "celery -A app.celery_app.celery_app (worker|beat)" || true

echo "Starting uvicorn (reload) in foreground..."
export MYBUDDY_LOG_TARGET="api"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload