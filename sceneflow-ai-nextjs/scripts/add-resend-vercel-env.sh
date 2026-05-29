#!/usr/bin/env bash
# Add Resend env vars to Vercel (run after: npx vercel login)
set -euo pipefail
cd "$(dirname "$0")/.."

RESEND_API_KEY="${RESEND_API_KEY:?Set RESEND_API_KEY before running}"
RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL:-SceneFlow AI Studio <noreply@sfai.studio>}"

for env in production preview development; do
  printf '%s' "$RESEND_API_KEY" | npx vercel env add RESEND_API_KEY "$env" --force
  printf '%s' "$RESEND_FROM_EMAIL" | npx vercel env add RESEND_FROM_EMAIL "$env" --force
done

echo "Done. Redeploy production for changes to take effect:"
echo "  npx vercel --prod"
