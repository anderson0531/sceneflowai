#!/usr/bin/env bash
# Set KLING_API_KEY on Vercel (production + preview) and redeploy.
# Usage: VERCEL_TOKEN=vcp_... KLING_API_KEY='api-key-kling-...' ./scripts/set-kling-api-key-vercel.sh
set -euo pipefail
cd "$(dirname "$0")/.."

TOKEN="${VERCEL_TOKEN:-}"
KLING_KEY="${KLING_API_KEY:-}"

if [[ -z "$TOKEN" ]]; then
  echo "Set VERCEL_TOKEN (vcp_... from Vercel → Settings → Tokens)" >&2
  exit 1
fi
if [[ -z "$KLING_KEY" ]]; then
  echo "Set KLING_API_KEY to the Kling bearer token" >&2
  exit 1
fi

export VERCEL_TOKEN="$TOKEN"
export KLING_API_KEY="$KLING_KEY"

python3 <<'PY'
import json, os, urllib.request, urllib.error

TOKEN = os.environ["VERCEL_TOKEN"]
PROJECT = "prj_XshLyz978ywtolH0avcsOk8DQGD4"
TEAM = "team_ZxPrBTnP7RBQelzqiR5GDsWt"
KEY = os.environ["KLING_API_KEY"]
QS = f"?teamId={TEAM}"

def req(method, url, body=None):
    data = None if body is None else json.dumps(body).encode()
    r = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(r) as res:
            return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(err, file=__import__("sys").stderr)
        raise SystemExit(1) from e

envs = req("GET", f"https://api.vercel.com/v9/projects/{PROJECT}/env{QS}").get("envs", [])
match = next((e for e in envs if e.get("key") == "KLING_API_KEY"), None)

if match:
    print(f"Updating KLING_API_KEY id={match['id']} targets={match.get('target')}...")
    req(
        "PATCH",
        f"https://api.vercel.com/v9/projects/{PROJECT}/env/{match['id']}{QS}",
        {
            "value": KEY,
            "type": "sensitive",
            "target": match.get("target") or ["production", "preview"],
        },
    )
else:
    print("Creating KLING_API_KEY for production + preview...")
    req(
        "POST",
        f"https://api.vercel.com/v10/projects/{PROJECT}/env{QS}",
        [
            {
                "key": "KLING_API_KEY",
                "value": KEY,
                "type": "sensitive",
                "target": ["production", "preview"],
            }
        ],
    )

print("Redeploying production...")
deployments = req(
    "GET",
    f"https://api.vercel.com/v6/deployments?projectId={PROJECT}&teamId={TEAM}&limit=10&target=production",
).get("deployments", [])
ready = next((d for d in deployments if d.get("state") == "READY"), None)
if not ready:
    print("No READY production deployment; redeploy manually in Vercel dashboard.")
else:
    redeploy = req(
        "POST",
        f"https://api.vercel.com/v13/deployments?teamId={TEAM}",
        {"name": "sceneflow-ai-nextjs", "deploymentId": ready["uid"], "target": "production"},
    )
    print("Redeploy:", redeploy.get("url"), redeploy.get("readyState"))

print("KLING_API_KEY set on Vercel (value not echoed — sensitive).")
PY
