#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$ROOT_DIR/sceneflow-ai-nextjs"
VERCEL_DIR="$ROOT_DIR"

log() {
  printf '%s\n' "$1"
}

if [ ! -f "$APP_DIR/package.json" ]; then
  log "Error: could not find sceneflow-ai-nextjs package at $APP_DIR"
  exit 1
fi

if [ ! -d "$VERCEL_DIR" ]; then
  log "Error: could not find sceneflow-ai-nextjs repo at $VERCEL_DIR"
  exit 1
fi

log "=== DOL Production Deployment ==="
log "Checking environment variables"
for VAR in GEMINI_API_KEY OPENAI_API_KEY DATABASE_URL; do
  if [ -z "${!VAR:-}" ]; then
    log "Warning: $VAR is not set"
  fi
done

log "[1/4] Building application"
(
  cd "$APP_DIR"
  npm run build
)

log "[2/4] Running database migrations"
(
  cd "$APP_DIR"
  npm run db:migrate
)

log "[3/4] Running DOL tests"
(
  cd "$APP_DIR"
  npm run test:dol
)

log "[4/4] Deploying to Vercel"
(
  cd "$VERCEL_DIR"
  npx vercel --prod
)

log "Deployment complete"
