#!/usr/bin/env bash
# =============================================================================
# Landing hero HLS: GCS bucket + public read + CORS + Transcoder IAM.
# Optionally stand up Cloud CDN in front of the same bucket.
#
# Fast path (no custom domain): after this script, set
#   NEXT_PUBLIC_LANDING_VIDEO_CDN=https://storage.googleapis.com/$BUCKET
# on Vercel and run: npm run landing:transcode-hero -- --batch
#
# Cloud CDN path (global Anycast, needs a hostname you control):
#   CDN_HOST=media.sceneflowai.studio ./scripts/setup-landing-video-cdn.sh
# Then set NEXT_PUBLIC_LANDING_VIDEO_CDN=https://$CDN_HOST
# =============================================================================
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-${VERTEX_PROJECT_ID:-}}"
REGION="${GCP_REGION:-us-central1}"
BUCKET="${GCS_LANDING_VIDEO_BUCKET:-sceneflow-landing-videos}"
CDN_HOST="${CDN_HOST:-}"

if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "your_gcp_project_id_here" ]]; then
  echo "Set GCP_PROJECT_ID (or VERTEX_PROJECT_ID) to the GCP project id." >&2
  exit 1
fi

gcloud config set project "$PROJECT_ID" >/dev/null

echo "Enabling APIs (storage, transcoder, compute for optional CDN)..."
gcloud services enable \
  storage.googleapis.com \
  transcoder.googleapis.com \
  compute.googleapis.com \
  --project="$PROJECT_ID"

if ! gcloud storage buckets describe "gs://${BUCKET}" >/dev/null 2>&1; then
  echo "Creating gs://${BUCKET} in ${REGION}..."
  gcloud storage buckets create "gs://${BUCKET}" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --uniform-bucket-level-access
else
  echo "Bucket gs://${BUCKET} already exists."
fi

echo "Public read (marketing assets) + CORS for browser HLS..."
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member=allUsers \
  --role=roles/storage.objectViewer \
  --project="$PROJECT_ID" >/dev/null

CORS_JSON="$(mktemp)"
cat >"$CORS_JSON" <<'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": [
      "Content-Type",
      "Range",
      "Accept-Ranges",
      "Content-Range"
    ],
    "maxAgeSeconds": 3600
  }
]
EOF
gcloud storage buckets update "gs://${BUCKET}" --cors-file="$CORS_JSON"
rm -f "$CORS_JSON"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
TRANSCODER_SA="service-${PROJECT_NUMBER}@gcp-sa-transcoder.iam.gserviceaccount.com"
echo "Granting Transcoder ${TRANSCODER_SA} objectAdmin on the bucket..."
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${TRANSCODER_SA}" \
  --role=roles/storage.objectAdmin \
  --project="$PROJECT_ID" >/dev/null

GCS_HTTPS="https://storage.googleapis.com/${BUCKET}"
echo ""
echo "HLS is reachable at:"
echo "  ${GCS_HTTPS}/hero/{locale}/hls/manifest.m3u8"
echo "Set this now (no load balancer required):"
echo "  NEXT_PUBLIC_LANDING_VIDEO_CDN=${GCS_HTTPS}"

if [[ -z "$CDN_HOST" ]]; then
  echo ""
  echo "Skipped Cloud CDN. Re-run with CDN_HOST=media.example.com to attach a global HTTPS LB."
  exit 0
fi

BACKEND="sceneflow-landing-videos-backend"
URL_MAP="sceneflow-landing-videos-map"
CERT="sceneflow-landing-videos-cert"
PROXY="sceneflow-landing-videos-https"
IP_NAME="sceneflow-landing-videos-ip"
FORWARDING="sceneflow-landing-videos-https-fw"

echo ""
echo "Creating Cloud CDN backend bucket + HTTPS load balancer for ${CDN_HOST}..."

if ! gcloud compute backend-buckets describe "$BACKEND" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute backend-buckets create "$BACKEND" \
    --gcs-bucket-name="$BUCKET" \
    --enable-cdn \
    --cache-mode=CACHE_ALL_STATIC \
    --project="$PROJECT_ID"
else
  gcloud compute backend-buckets update "$BACKEND" \
    --enable-cdn \
    --cache-mode=CACHE_ALL_STATIC \
    --project="$PROJECT_ID" >/dev/null
fi

if ! gcloud compute url-maps describe "$URL_MAP" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute url-maps create "$URL_MAP" \
    --default-backend-bucket="$BACKEND" \
    --project="$PROJECT_ID"
fi

if ! gcloud compute ssl-certificates describe "$CERT" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute ssl-certificates create "$CERT" \
    --domains="$CDN_HOST" \
    --global \
    --project="$PROJECT_ID"
fi

if ! gcloud compute target-https-proxies describe "$PROXY" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute target-https-proxies create "$PROXY" \
    --url-map="$URL_MAP" \
    --ssl-certificates="$CERT" \
    --project="$PROJECT_ID"
fi

if ! gcloud compute addresses describe "$IP_NAME" --global --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute addresses create "$IP_NAME" --global --project="$PROJECT_ID"
fi
IP="$(gcloud compute addresses describe "$IP_NAME" --global --project="$PROJECT_ID" --format='value(address)')"

if ! gcloud compute forwarding-rules describe "$FORWARDING" --global --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute forwarding-rules create "$FORWARDING" \
    --global \
    --target-https-proxy="$PROXY" \
    --address="$IP" \
    --ports=443 \
    --project="$PROJECT_ID"
fi

echo ""
echo "Point ${CDN_HOST} A record at ${IP}, wait for the managed cert, then set:"
echo "  NEXT_PUBLIC_LANDING_VIDEO_CDN=https://${CDN_HOST}"
