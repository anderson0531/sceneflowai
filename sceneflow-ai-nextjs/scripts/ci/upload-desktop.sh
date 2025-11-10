#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<EOF
Usage: [options]

Options:
  --platform mac|win|all   Platforms to build (default: mac)
  --dry-run                Do not upload artifacts (sets DRY_RUN=true)
  -h, --help               Show this message

Environment:
  NODE_ENV=production
  VERCEL_BLOB_RW_TOKEN (required unless --dry-run is used)
  APPLE_ID / APPLE_TEAM_ID / APPLE_APP_SPECIFIC_PASSWORD (optional, for notarization)
  NOTARYTOOL_PROFILE (optional, alternative notarization credential)
EOF
}

PLATFORM="mac"
UPLOAD_DRY_RUN="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform)
      PLATFORM="${2:-}"
      shift 2
      ;;
    --dry-run)
      UPLOAD_DRY_RUN="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "$UPLOAD_DRY_RUN" != "true" && -z "${VERCEL_BLOB_RW_TOKEN:-}" ]]; then
  echo "error: VERCEL_BLOB_RW_TOKEN is required unless --dry-run is set." >&2
  exit 1
fi

echo "==> Installing dependencies"
npm ci

build_mac() {
  echo "==> Building macOS artifacts"
  npm run electron:build

  if [[ -n "${APPLE_ID:-}" || -n "${NOTARYTOOL_PROFILE:-}" ]]; then
    echo "==> Notarizing macOS artifacts"
    for artifact in dist/desktop/*.dmg dist/desktop/*.zip; do
      [[ -f "$artifact" ]] || continue
      scripts/notarize-macos.sh "$artifact"
    done
  else
    echo "Skipping notarization (APPLE_ID/NOTARYTOOL_PROFILE not set)"
  fi
}

build_win() {
  echo "==> Building Windows artifacts"
  npm run electron:build:win
}

case "$PLATFORM" in
  mac)
    build_mac
    ;;
  win)
    build_win
    ;;
  all)
    build_mac
    build_win
    ;;
  *)
    echo "error: unknown platform '$PLATFORM'. Expected mac|win|all" >&2
    exit 1
    ;;
esac

echo "==> Uploading artifacts"
if [[ "$UPLOAD_DRY_RUN" == "true" ]]; then
  DRY_RUN=true node scripts/upload-renderer.js
else
  node scripts/upload-renderer.js
fi

echo "CI desktop upload completed."
#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<EOF
Usage: [options]

Options:
  --platform mac|win|all   Platforms to build (default: mac)
  --dry-run                Do not upload artifacts (sets DRY_RUN=true)
  -h, --help               Show this message

Environment:
  NODE_ENV=production
  VERCEL_BLOB_RW_TOKEN (required unless --dry-run is used)
  APPLE_ID / APPLE_TEAM_ID / APPLE_APP_SPECIFIC_PASSWORD (optional, for notarization)
  NOTARYTOOL_PROFILE (optional, alternative notarization credential)
EOF
}

PLATFORM="mac"
UPLOAD_DRY_RUN="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform)
      PLATFORM="${2:-}"
      shift 2
      ;;
    --dry-run)
      UPLOAD_DRY_RUN="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "$UPLOAD_DRY_RUN" != "true" && -z "${VERCEL_BLOB_RW_TOKEN:-}" ]]; then
  echo "error: VERCEL_BLOB_RW_TOKEN is required unless --dry-run is set." >&2
  exit 1
fi

echo "==> Installing dependencies"
npm ci

build_mac() {
  echo "==> Building macOS artifacts"
  npm run electron:build

  if [[ -n "${APPLE_ID:-}" ]]; then
    echo "==> Notarizing macOS artifacts"
    for artifact in dist/desktop/*.dmg dist/desktop/*.zip; do
      [[ -f "$artifact" ]] || continue
      scripts/notarize-macos.sh "$artifact"
    done
  else
    echo "Skipping notarization (APPLE_ID not set)"
  fi
}

build_win() {
  echo "==> Building Windows artifacts"
  npm run electron:build:win
}

case "$PLATFORM" in
  mac)
    build_mac
    ;;
  win)
    build_win
    ;;
  all)
    build_mac
    build_win
    ;;
  *)
    echo "error: unknown platform '$PLATFORM'. Expected mac|win|all" >&2
    exit 1
    ;;
esac

echo "==> Uploading artifacts"
if [[ "$UPLOAD_DRY_RUN" == "true" ]]; then
  DRY_RUN=true node scripts/upload-renderer.js
else
  node scripts/upload-renderer.js
fi

echo "CI desktop upload completed."

