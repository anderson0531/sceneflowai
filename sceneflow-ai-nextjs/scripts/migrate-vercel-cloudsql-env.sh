#!/usr/bin/env bash
# Migrate Vercel env from Supabase to Cloud SQL.
# Prereq: npx vercel login (or VERCEL_TOKEN set)
set -euo pipefail
cd "$(dirname "$0")/.."

CLOUD_SQL_INSTANCE_CONNECTION_NAME="${CLOUD_SQL_INSTANCE_CONNECTION_NAME:-sceneflowai-2d3e6:us-central1:sceneflow-db}"
DB_USER="${DB_USER:-sceneflow_app}"
DB_NAME="${DB_NAME:-sceneflow}"

if [[ -z "${DB_PASSWORD:-}" ]]; then
  if [[ -f .cloud-sql-credentials.local ]]; then
    # shellcheck disable=SC1091
    source .cloud-sql-credentials.local
  fi
fi
DB_PASSWORD="${DB_PASSWORD:?Set DB_PASSWORD or create .cloud-sql-credentials.local}"

SUPABASE_VARS=(
  DATABASE_URL
  DATABASE_URL_DIRECT
  POSTGRES_URL_NON_POOLING
  SUPABASE_DATABASE_URL
  SUPABASE_PROJECT_REF
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_URL
)

add_var() {
  local name="$1" value="$2" env="$3"
  if npx vercel env ls "$env" 2>/dev/null | grep -q "^ ${name} "; then
    echo "Updating ${name} (${env})..."
    npx vercel env rm "$name" "$env" --yes 2>/dev/null || true
  else
    echo "Adding ${name} (${env})..."
  fi
  printf '%s' "$value" | npx vercel env add "$name" "$env"
}

remove_var() {
  local name="$1" env="$2"
  if npx vercel env ls "$env" 2>/dev/null | grep -q "^ ${name} "; then
    echo "Removing ${name} (${env})..."
    npx vercel env rm "$name" "$env" --yes
  else
    echo "Skip ${name} (${env}) — not set"
  fi
}

echo "Vercel account:"
npx vercel whoami

for env in production preview development; do
  echo ""
  echo "=== ${env} ==="
  add_var CLOUD_SQL_INSTANCE_CONNECTION_NAME "$CLOUD_SQL_INSTANCE_CONNECTION_NAME" "$env"
  add_var DB_USER "$DB_USER" "$env"
  add_var DB_PASSWORD "$DB_PASSWORD" "$env"
  add_var DB_NAME "$DB_NAME" "$env"
  for var in "${SUPABASE_VARS[@]}"; do
    remove_var "$var" "$env"
  done
done

echo ""
echo "Done. Redeploy production:"
echo "  npx vercel --prod"
