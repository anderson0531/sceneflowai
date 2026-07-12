#!/usr/bin/env bash
# Configure Vercel env for Kling long-take pipeline + stitch renderer.
# Prereq: npx vercel login  (or export VERCEL_TOKEN)
set -euo pipefail
cd "$(dirname "$0")/.."

PRODUCTION_URL="${KLING_WEBHOOK_BASE_URL:-https://sceneflowai.studio}"
GCP_PROJECT_ID="${GCP_PROJECT_ID:-sceneflowai-2d3e6}"
GCP_REGION="${GCP_REGION:-us-central1}"
GCS_RENDER_BUCKET="${GCS_RENDER_BUCKET:-sceneflow-render-jobs}"
CLOUD_RUN_JOB_NAME="${CLOUD_RUN_JOB_NAME:-sceneflow-ffmpeg-renderer}"

if [[ -z "${KLING_WEBHOOK_SECRET:-}" ]]; then
  if [[ -f .kling-longtake-env.local ]]; then
    # shellcheck disable=SC1091
    source .kling-longtake-env.local
  fi
fi

if [[ -z "${KLING_WEBHOOK_SECRET:-}" ]]; then
  KLING_WEBHOOK_SECRET="$(openssl rand -hex 32)"
  cat > .kling-longtake-env.local <<EOF
# Generated $(date -u +%Y-%m-%dT%H:%M:%SZ) — do not commit
KLING_WEBHOOK_SECRET=${KLING_WEBHOOK_SECRET}
KLING_WEBHOOK_BASE_URL=${PRODUCTION_URL}
EOF
  chmod 600 .kling-longtake-env.local
  echo "Generated KLING_WEBHOOK_SECRET → .kling-longtake-env.local"
fi

add_var() {
  local name="$1" value="$2" env="$3"
  if npx vercel env ls "$env" 2>/dev/null | grep -qE "^[[:space:]]*${name}[[:space:]]"; then
    echo "Updating ${name} (${env})..."
    npx vercel env rm "$name" "$env" --yes 2>/dev/null || true
  else
    echo "Adding ${name} (${env})..."
  fi
  printf '%s' "$value" | npx vercel env add "$name" "$env"
}

echo "Vercel account:"
npx vercel whoami

for env in production preview development; do
  echo ""
  echo "=== ${env} ==="
  add_var KLING_ASYNC "true" "$env"
  add_var KLING_WEBHOOK_SECRET "$KLING_WEBHOOK_SECRET" "$env"
  add_var KLING_WEBHOOK_BASE_URL "$PRODUCTION_URL" "$env"
  add_var GCS_RENDER_BUCKET "$GCS_RENDER_BUCKET" "$env"
  add_var CLOUD_RUN_JOB_NAME "$CLOUD_RUN_JOB_NAME" "$env"
  add_var GCP_PROJECT_ID "$GCP_PROJECT_ID" "$env"
  add_var GCP_REGION "$GCP_REGION" "$env"
  add_var CLOUD_RUN_REGION "$GCP_REGION" "$env"
  add_var KLING_PRIMARY_ENABLED "true" "$env"
  add_var KLING_DEFAULT_MODEL "kling-v3-omni" "$env"
  add_var KLING_DEFAULT_QUALITY "pro" "$env"
  add_var KLING_SOUND_ENABLED "false" "$env"
  add_var KLING_VEO_FALLBACK_ENABLED "true" "$env"
  add_var KLING_POLL_TIMEOUT_SEC "1800" "$env"
  add_var NEXT_PUBLIC_APP_URL "$PRODUCTION_URL" "$env"
done

echo ""
echo "Done. Redeploy production so env vars take effect:"
echo "  npx vercel --prod"
echo ""
echo "Still required from Kling developer console (API keys only — no webhook UI):"
echo "  KLING_ACCESS_KEY + KLING_SECRET_KEY  (or KLING_API_KEY)"
echo "Webhook URL is sent per-request automatically to:"
echo "  ${PRODUCTION_URL}/api/webhooks/kling"
