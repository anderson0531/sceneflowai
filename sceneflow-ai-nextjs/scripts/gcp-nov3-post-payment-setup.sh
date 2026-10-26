#!/usr/bin/env bash
# ==============================================================================
# SceneFlow AI — Nov 3rd Post-Payment GCP Optimization & Startup Readiness Script
# ==============================================================================
# Run this script on Nov 3rd after paying the past-due balance on Billing Account
# 018BC7-19AC32-7CE0EE ("SceneFlow Platform"):
#
#   bash scripts/gcp-nov3-post-payment-setup.sh
#
# Optional flags:
#   --delete-unused-projects   Also delete empty unused projects
#                              (sceneflow-export, gen-lang-client-0842101693)
# ==============================================================================

set -euo pipefail

export PATH="/Users/briananderson/google-cloud-sdk/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
unset CLOUDSDK_PYTHON_SITEPACKAGES

PRIMARY_PROJECT="sceneflowai-2d3e6"
PRIMARY_BILLING="018BC7-19AC32-7CE0EE"
RENDER_JOBS_BUCKET="sceneflow-render-jobs"
ASSETS_BUCKET="sceneflow-assets"
LEGACY_REFS_BUCKET="sceneflow-character-refs"
DELETE_UNUSED_PROJECTS=false

for arg in "$@"; do
  case "$arg" in
    --delete-unused-projects)
      DELETE_UNUSED_PROJECTS=true
      ;;
  esac
done

echo "=============================================================================="
echo " SceneFlow AI — Post-Payment GCP Setup & Cost Guardrails"
echo " Target Project : ${PRIMARY_PROJECT}"
echo " Target Billing : ${PRIMARY_BILLING} (SceneFlow Platform, USD)"
echo "=============================================================================="
echo ""

# ------------------------------------------------------------------------------
# 1. Verify Billing Account Status & Single-Project Consolidation
# ------------------------------------------------------------------------------
echo "=== [1/6] Checking Billing Account ${PRIMARY_BILLING} Status ==="
BILLING_OPEN=$(gcloud billing accounts describe "${PRIMARY_BILLING}" --format="value(open)" 2>/dev/null || echo "false")
echo "Billing Account ${PRIMARY_BILLING} open status: ${BILLING_OPEN}"

if [[ "${BILLING_OPEN}" != "True" && "${BILLING_OPEN}" != "true" ]]; then
  echo "WARNING: Billing Account ${PRIMARY_BILLING} still reports open=${BILLING_OPEN}."
  echo "If you just paid the balance, Google Payments can take 5-15 minutes to re-activate."
  echo "Continuing with steps that do not require active billing..."
fi

echo "Ensuring ${PRIMARY_PROJECT} is linked to ${PRIMARY_BILLING}..."
gcloud billing projects link "${PRIMARY_PROJECT}" --billing-account="${PRIMARY_BILLING}" >/dev/null

echo "Ensuring duplicate project gen-lang-client-0842101693 is unlinked..."
gcloud billing projects unlink "gen-lang-client-0842101693" >/dev/null 2>&1 || true

echo "Currently linked projects on ${PRIMARY_BILLING}:"
gcloud billing projects list --billing-account="${PRIMARY_BILLING}"
echo ""

# ------------------------------------------------------------------------------
# 2. Verify Cloud SQL Cleanup & Restart sceneflow-db with Cost Guards
# ------------------------------------------------------------------------------
echo "=== [2/6] Verifying Cloud SQL Instances in ${PRIMARY_PROJECT} ==="
for DB in clearsight-db clearsight-db-v2; do
  if gcloud sql instances describe "${DB}" --project="${PRIMARY_PROJECT}" >/dev/null 2>&1; then
    echo "Deleting unused Cloud SQL instance ${DB}..."
    gcloud sql instances delete "${DB}" --project="${PRIMARY_PROJECT}" --quiet
  else
    echo "✅ Confirmed unused instance '${DB}' is already permanently deleted."
  fi
done

echo "Checking primary database 'sceneflow-db'..."
DB_STATE=$(gcloud sql instances describe sceneflow-db --project="${PRIMARY_PROJECT}" --format="value(state)" 2>/dev/null || echo "UNKNOWN")
echo "sceneflow-db state: ${DB_STATE}"

if [[ "${BILLING_OPEN}" == "True" || "${BILLING_OPEN}" == "true" ]]; then
  echo "Applying cost-optimized settings to sceneflow-db (activation-policy=ALWAYS, no Dataplex, 7 retained backups)..."
  gcloud sql instances patch sceneflow-db \
    --project="${PRIMARY_PROJECT}" \
    --activation-policy=ALWAYS \
    --no-enable-dataplex-integration \
    --retained-backups-count=7 \
    --quiet || echo "Note: sceneflow-db patch skipped or still warming up."
fi
echo ""

# ------------------------------------------------------------------------------
# 3. Set 7-Day Auto-Delete Lifecycle Rule on gs://sceneflow-render-jobs
# ------------------------------------------------------------------------------
echo "=== [3/6] Setting 7-Day Auto-Delete Lifecycle Rule on gs://${RENDER_JOBS_BUCKET} ==="
TOKEN=$(gcloud auth print-access-token)
LIFECYCLE_PAYLOAD='{"lifecycle":{"rule":[{"action":{"type":"Delete"},"condition":{"age":7}}]}}'

HTTP_CODE=$(curl -s -o /tmp/gcs_lifecycle_resp.json -w "%{http_code}" -X PATCH \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${LIFECYCLE_PAYLOAD}" \
  "https://storage.googleapis.com/storage/v1/b/${RENDER_JOBS_BUCKET}?fields=lifecycle")

if [[ "${HTTP_CODE}" == "200" ]]; then
  echo "✅ Applied 7-day auto-delete lifecycle rule to gs://${RENDER_JOBS_BUCKET}:"
  cat /tmp/gcs_lifecycle_resp.json
  echo ""
else
  echo "⚠️ Could not apply lifecycle rule yet (HTTP ${HTTP_CODE}):"
  cat /tmp/gcs_lifecycle_resp.json
  echo ""
fi
rm -f /tmp/gcs_lifecycle_resp.json
echo ""

# ------------------------------------------------------------------------------
# 4. Configure Cloud Billing Budget Alerts ($50, $100, $200, $250/mo)
# ------------------------------------------------------------------------------
echo "=== [4/6] Configuring Cloud Billing Budget Alerts on ${PRIMARY_BILLING} ==="
gcloud services enable billingbudgets.googleapis.com --project="${PRIMARY_PROJECT}" 2>/dev/null || true

EXISTING_BUDGETS=$(gcloud billing budgets list --billing-account="${PRIMARY_BILLING}" --format="value(displayName)" 2>/dev/null || true)
if echo "${EXISTING_BUDGETS}" | grep -q "SceneFlow Monthly Guardrail"; then
  echo "✅ Budget 'SceneFlow Monthly Guardrail' already exists on ${PRIMARY_BILLING}."
else
  echo "Creating 'SceneFlow Monthly Guardrail' ($250/mo budget with 20%, 40%, 80%, 100% alerts)..."
  gcloud billing budgets create \
    --billing-account="${PRIMARY_BILLING}" \
    --display-name="SceneFlow Monthly Guardrail" \
    --budget-amount=250USD \
    --threshold-rule=percent=0.20,basis=current-spend \
    --threshold-rule=percent=0.40,basis=current-spend \
    --threshold-rule=percent=0.80,basis=current-spend \
    --threshold-rule=percent=1.00,basis=current-spend \
    --threshold-rule=percent=1.00,basis=forecasted-spend || echo "⚠️ Budget creation requires active billing or Billing Account Admin permissions."
fi
echo ""

# ------------------------------------------------------------------------------
# 5. Clean Up Unused GCP Projects (Optional Flag: --delete-unused-projects)
# ------------------------------------------------------------------------------
echo "=== [5/6] Checking Unused GCP Projects ==="
if [[ "${DELETE_UNUSED_PROJECTS}" == "true" ]]; then
  for UNUSED_PROJ in sceneflow-export gen-lang-client-0842101693; do
    echo "Deleting empty unused project ${UNUSED_PROJ}..."
    gcloud projects delete "${UNUSED_PROJ}" --quiet || echo "⚠️ Could not delete ${UNUSED_PROJ} (may already be pending deletion)."
  done
else
  echo "Skipping project deletion (pass --delete-unused-projects to delete 'sceneflow-export' and 'gen-lang-client-0842101693')."
fi
echo ""

# ------------------------------------------------------------------------------
# 6. Verify IAM Alignment for Google for Startups $2K Credits Application
# ------------------------------------------------------------------------------
echo "=== [6/6] Google for Startups Application Readiness Summary ==="
echo "Project ID          : ${PRIMARY_PROJECT}"
echo "Billing Account ID  : ${PRIMARY_BILLING} (USD)"
echo "Project IAM Roles   :"
gcloud projects get-iam-policy "${PRIMARY_PROJECT}" \
  --flatten="bindings[].members" \
  --filter="bindings.role:(roles/owner OR roles/editor OR roles/billing.projectManager)" \
  --format="table(bindings.role, bindings.members)"
echo ""
echo "Billing Admins      :"
gcloud billing accounts get-iam-policy "${PRIMARY_BILLING}" \
  --flatten="bindings[].members" \
  --format="table(bindings.role, bindings.members)"
echo ""
echo "=============================================================================="
echo " Done! If you haven't accepted the Owner invite for brian@sceneflowai.studio"
echo " yet, open: https://console.cloud.google.com/iam-admin/iam?project=${PRIMARY_PROJECT}"
echo " and click 'Grant Access' -> brian@sceneflowai.studio -> Role: Owner."
echo "=============================================================================="
