#!/usr/bin/env bash
# ==============================================================================
# SceneFlow AI — GCP Organization Provisioning & Project Migration Script
# ==============================================================================
# Google Cloud does not allow creating an Organization from a @gmail.com account;
# instead, Google Cloud automatically provisions the 'sceneflowai.studio'
# Organization when your Google Workspace Super Admin (admin@sceneflowai.studio)
# authenticates to GCP.
#
# Usage:
#   bash scripts/gcp-setup-organization.sh
# ==============================================================================

set -euo pipefail

export PATH="/Users/briananderson/google-cloud-sdk/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
unset CLOUDSDK_PYTHON_SITEPACKAGES

ADMIN_EMAIL="admin@sceneflowai.studio"
FOUNDER_EMAIL="brian@sceneflowai.studio"
GMAIL_EMAIL="anderson0531@gmail.com"
PRIMARY_PROJECT="sceneflowai-2d3e6"
PRIMARY_BILLING="018BC7-19AC32-7CE0EE"

echo "=============================================================================="
echo " SceneFlow AI — GCP Organization Setup & Project Migration"
echo " Domain Admin   : ${ADMIN_EMAIL}"
echo " Target Project : ${PRIMARY_PROJECT}"
echo "=============================================================================="
echo ""

# ------------------------------------------------------------------------------
# 1. Ensure admin@sceneflowai.studio is authenticated in gcloud
# ------------------------------------------------------------------------------
if ! gcloud auth list --format="value(account)" | grep -qi "^${ADMIN_EMAIL}$"; then
  echo "=== [1/5] Authenticating ${ADMIN_EMAIL} in gcloud ==="
  echo "A browser window will open. Please sign in as ${ADMIN_EMAIL}..."
  gcloud auth login "${ADMIN_EMAIL}"
else
  echo "=== [1/5] ${ADMIN_EMAIL} is already authenticated in gcloud ==="
fi

# ------------------------------------------------------------------------------
# 2. Discover the sceneflowai.studio GCP Organization ID
# ------------------------------------------------------------------------------
echo ""
echo "=== [2/5] Looking up GCP Organization for sceneflowai.studio ==="
ORG_ID=$(gcloud organizations list --account="${ADMIN_EMAIL}" --filter="displayName:sceneflowai.studio" --format="value(ID)" | head -n 1 || true)

if [[ -z "${ORG_ID}" ]]; then
  ORG_ID=$(gcloud organizations list --account="${ADMIN_EMAIL}" --format="value(ID)" | head -n 1 || true)
fi

if [[ -z "${ORG_ID}" ]]; then
  echo "⚠️ No GCP Organization found yet for ${ADMIN_EMAIL}."
  echo "To trigger automatic Organization creation (free with Google Workspace / Cloud Identity):"
  echo "  1. Open https://console.cloud.google.com while signed in as ${ADMIN_EMAIL}"
  echo "  2. Accept the Google Cloud Terms of Service if prompted"
  echo "  3. Wait 1-2 minutes and re-run: bash scripts/gcp-setup-organization.sh"
  exit 1
fi

ORG_NAME=$(gcloud organizations describe "${ORG_ID}" --account="${ADMIN_EMAIL}" --format="value(displayName)" 2>/dev/null || echo "sceneflowai.studio")
echo "✅ Found GCP Organization: ${ORG_NAME} (ID: ${ORG_ID})"

# ------------------------------------------------------------------------------
# 3. Grant Organization IAM Roles (Admin + Project Mover)
# ------------------------------------------------------------------------------
echo ""
echo "=== [3/5] Granting Organization Admin & Project Mover Roles on Org ${ORG_ID} ==="
for MEMBER_EMAIL in "${ADMIN_EMAIL}" "${FOUNDER_EMAIL}" "${GMAIL_EMAIL}"; do
  for ROLE in \
    roles/resourcemanager.organizationAdmin \
    roles/resourcemanager.projectMover \
    roles/resourcemanager.projectCreator \
    roles/billing.admin; do
    echo "Granting ${ROLE} to user:${MEMBER_EMAIL} on Org ${ORG_ID}..."
    gcloud organizations add-iam-policy-binding "${ORG_ID}" \
      --account="${ADMIN_EMAIL}" \
      --member="user:${MEMBER_EMAIL}" \
      --role="${ROLE}" >/dev/null
  done
done
echo "✅ Organization IAM roles granted."

# ------------------------------------------------------------------------------
# 4. Move sceneflowai-2d3e6 into the sceneflowai.studio Organization
# ------------------------------------------------------------------------------
echo ""
echo "=== [4/5] Moving Project ${PRIMARY_PROJECT} into Organization ${ORG_ID} ==="
CURRENT_PARENT=$(gcloud projects describe "${PRIMARY_PROJECT}" --account="${ADMIN_EMAIL}" --format="value(parent.id)" 2>/dev/null || true)

if [[ "${CURRENT_PARENT}" == "${ORG_ID}" ]]; then
  echo "✅ Project ${PRIMARY_PROJECT} is already inside Organization ${ORG_ID}."
else
  echo "Migrating ${PRIMARY_PROJECT} into Organization ${ORG_ID}..."
  gcloud beta projects move "${PRIMARY_PROJECT}" \
    --organization="${ORG_ID}" \
    --account="${ADMIN_EMAIL}" \
    --quiet
  echo "✅ Project ${PRIMARY_PROJECT} is now inside Organization ${ORG_ID} (${ORG_NAME})!"
fi

# ------------------------------------------------------------------------------
# 5. Grant Full Project Owner (roles/owner) to Domain Accounts
# ------------------------------------------------------------------------------
echo ""
echo "=== [5/5] Granting roles/owner on ${PRIMARY_PROJECT} to ${ADMIN_EMAIL} & ${FOUNDER_EMAIL} ==="
for DOMAIN_USER in "${ADMIN_EMAIL}" "${FOUNDER_EMAIL}"; do
  gcloud projects add-iam-policy-binding "${PRIMARY_PROJECT}" \
    --account="${ADMIN_EMAIL}" \
    --member="user:${DOMAIN_USER}" \
    --role="roles/owner" >/dev/null
  echo "✅ Granted roles/owner to user:${DOMAIN_USER} on ${PRIMARY_PROJECT}"
done

echo ""
echo "=============================================================================="
echo " 🎉 Organization & Ownership Setup Complete!"
echo " Organization      : ${ORG_NAME} (${ORG_ID})"
echo " Project           : ${PRIMARY_PROJECT} (now under ${ORG_NAME})"
echo " Billing Account   : ${PRIMARY_BILLING} (USD)"
echo " Domain Owners     : ${ADMIN_EMAIL}, ${FOUNDER_EMAIL}"
echo "=============================================================================="
