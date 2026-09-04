#!/usr/bin/env bash
# Production deploy for the sceneflowai monorepo.
# Builds the Next.js app, runs tests, commits, and pushes to GitHub main.
# Vercel auto-deploys from the GitHub connection on push to main.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${REPO_ROOT}/sceneflow-ai-nextjs"

echo "SceneFlow AI — production deploy (Git → Vercel)"
echo "Repo root: ${REPO_ROOT}"
echo "App dir:   ${APP_DIR}"
echo ""

if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "Error: sceneflow-ai-nextjs/package.json not found."
  exit 1
fi

cd "${APP_DIR}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Warning: DATABASE_URL is not set. Vercel Production has it configured;"
  echo "         local builds need DATABASE_URL (or Cloud SQL vars) to collect page data."
fi

echo "Building Next.js app..."
npm run build

echo "Running unit tests..."
npm run test

cd "${REPO_ROOT}"

if [[ -n "$(git status --porcelain)" ]]; then
  COMMIT_MSG="${1:-Production deploy — $(date -u '+%Y-%m-%d %H:%M UTC')}"
  echo "Committing changes: ${COMMIT_MSG}"
  git add -A
  git commit -m "${COMMIT_MSG}"
else
  echo "No uncommitted changes."
fi

AHEAD="$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"
if [[ "${AHEAD}" == "0" ]]; then
  echo "Nothing to push — origin/main is already up to date."
  exit 0
fi

echo "Pushing ${AHEAD} commit(s) to origin/main (triggers Vercel)..."
git push -u origin main

echo ""
echo "Push complete. Vercel will build from GitHub."
echo "Monitor: https://vercel.com/anderson0531-3626s-projects/sceneflow-ai-nextjs"
echo "Production: https://sceneflowai.studio"
