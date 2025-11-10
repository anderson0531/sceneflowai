#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<EOF
Usage: APPLE_ID=you@example.com APPLE_TEAM_ID=TEAMID APPLE_APP_SPECIFIC_PASSWORD=xxxx \\
       $0 <dmg-or-zip-path>

Submits the specified DMG/ZIP to Apple notarization and waits for completion.

Environment variables:
  APPLE_ID                   Apple ID email (required)
  APPLE_TEAM_ID              Apple Developer Team ID (required)
  APPLE_APP_SPECIFIC_PASSWORD App-specific password generated in Apple ID (required)
  NOTARYTOOL_PROFILE         Optional keychain profile created via \`xcrun notarytool store-credentials\`.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 1 ]]; then
  echo "error: expected exactly one argument (path to dmg/zip)" >&2
  usage
  exit 1
fi

ARTIFACT_PATH="$1"

if [[ ! -f "$ARTIFACT_PATH" ]]; then
  echo "error: file not found: $ARTIFACT_PATH" >&2
  exit 1
fi

if ! command -v xcrun >/dev/null 2>&1; then
  echo "error: xcrun not found. Install Xcode command line tools." >&2
  exit 1
fi

APPLE_ID="${APPLE_ID:-}"
APPLE_TEAM_ID="${APPLE_TEAM_ID:-}"
APPLE_APP_SPECIFIC_PASSWORD="${APPLE_APP_SPECIFIC_PASSWORD:-}"
NOTARY_PROFILE="${NOTARYTOOL_PROFILE:-}"

if [[ -z "$NOTARY_PROFILE" ]]; then
  if [[ -z "$APPLE_ID" || -z "$APPLE_TEAM_ID" || -z "$APPLE_APP_SPECIFIC_PASSWORD" ]]; then
    echo "error: set APPLE_ID, APPLE_TEAM_ID, and APPLE_APP_SPECIFIC_PASSWORD or provide NOTARYTOOL_PROFILE" >&2
    exit 1
  fi
  NOTARY_ARGS=(
    "notarytool" "submit" "$ARTIFACT_PATH"
    "--apple-id" "$APPLE_ID"
    "--team-id" "$APPLE_TEAM_ID"
    "--password" "$APPLE_APP_SPECIFIC_PASSWORD"
    "--wait"
  )
else
  NOTARY_ARGS=(
    "notarytool" "submit" "$ARTIFACT_PATH"
    "--keychain-profile" "$NOTARY_PROFILE"
    "--wait"
  )
fi

echo "Submitting $ARTIFACT_PATH for notarization..."
xcrun "${NOTARY_ARGS[@]}"

echo "Stapling ticket..."
xcrun stapler staple "$ARTIFACT_PATH"

echo "Notarization complete."
#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<EOF
Usage: APPLE_ID=you@example.com APPLE_TEAM_ID=TEAMID APPLE_APP_SPECIFIC_PASSWORD=xxxx \\
       $0 <dmg-or-zip-path>

Submits the specified DMG/ZIP to Apple notarization and waits for completion.

Environment variables:
  APPLE_ID                   Apple ID email (required)
  APPLE_TEAM_ID              Apple Developer Team ID (required)
  APPLE_APP_SPECIFIC_PASSWORD App-specific password generated in Apple ID (required)
  NOTARYTOOL_PROFILE         Optional keychain profile created via \`xcrun notarytool store-credentials\`.

Examples:
  APPLE_ID=dev@example.com APPLE_TEAM_ID=ABCDE12345 APPLE_APP_SPECIFIC_PASSWORD=abcd-efgh-ijkl \\
    $0 dist/desktop/SceneFlow-Renderer-2.0.1-x64.dmg
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 1 ]]; then
  echo "error: expected exactly one argument (path to dmg/zip)" >&2
  usage
  exit 1
fi

ARTIFACT_PATH="$1"

if [[ ! -f "$ARTIFACT_PATH" ]]; then
  echo "error: file not found: $ARTIFACT_PATH" >&2
  exit 1
fi

if ! command -v xcrun >/dev/null 2>&1; then
  echo "error: xcrun not found. Install Xcode command line tools." >&2
  exit 1
fi

APPLE_ID="${APPLE_ID:-}"
APPLE_TEAM_ID="${APPLE_TEAM_ID:-}"
APPLE_APP_SPECIFIC_PASSWORD="${APPLE_APP_SPECIFIC_PASSWORD:-}"
NOTARY_PROFILE="${NOTARYTOOL_PROFILE:-}"

if [[ -z "$NOTARY_PROFILE" ]]; then
  if [[ -z "$APPLE_ID" || -z "$APPLE_TEAM_ID" || -z "$APPLE_APP_SPECIFIC_PASSWORD" ]]; then
    echo "error: set APPLE_ID, APPLE_TEAM_ID, and APPLE_APP_SPECIFIC_PASSWORD or provide NOTARYTOOL_PROFILE" >&2
    exit 1
  fi
  NOTARY_ARGS=(
    "notarytool" "submit" "$ARTIFACT_PATH"
    "--apple-id" "$APPLE_ID"
    "--team-id" "$APPLE_TEAM_ID"
    "--password" "$APPLE_APP_SPECIFIC_PASSWORD"
    "--wait"
  )
else
  NOTARY_ARGS=(
    "notarytool" "submit" "$ARTIFACT_PATH"
    "--keychain-profile" "$NOTARY_PROFILE"
    "--wait"
  )
fi

echo "Submitting $ARTIFACT_PATH for notarization..."
xcrun "${NOTARY_ARGS[@]}"

echo "Stapling ticket..."
xcrun stapler staple "$ARTIFACT_PATH"

echo "Notarization complete."

