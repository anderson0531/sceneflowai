#!/bin/bash
set -e

# SceneFlow AI - Vertex AI IAM Fix
# This script grants the required IAM roles for Imagen image generation

# Add gcloud to PATH
export PATH="$HOME/google-cloud-sdk/bin:$PATH"

PROJECT_ID="life-focus-402608"
SA_EMAIL="sceneflow-vertex-ai@gen-lang-client-0596406756.iam.gserviceaccount.com"
REGION="us-central1"

echo "🔧 Fixing Vertex AI IAM permissions..."
echo "Project: $PROJECT_ID"
echo "Service Account: $SA_EMAIL"
echo "Region: $REGION"
echo ""

# Set active project
echo "📋 Setting active project..."
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo "🔌 Enabling Vertex AI API..."
gcloud services enable aiplatform.googleapis.com
gcloud services enable iamcredentials.googleapis.com

# Grant Vertex AI User role (required for aiplatform.endpoints.predict)
echo "👤 Granting roles/aiplatform.user..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/aiplatform.user" \
  --condition=None

# Grant Service Usage Consumer role
echo "🔑 Granting roles/serviceusage.serviceUsageConsumer..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/serviceusage.serviceUsageConsumer" \
  --condition=None

echo ""
echo "✅ IAM permissions granted successfully!"
echo ""
echo "🧪 Test the fix:"
echo "1. Wait 1-2 minutes for IAM propagation"
echo "2. Visit: https://sceneflow-ai-nextjs.vercel.app/admin/diagnostics"
echo "3. Click 'Run Diagnostics' - predictProbe should now show status 200 ✅"
echo "4. Try generating a character image in the Vision workflow"
echo ""
echo "📝 Note: If using GCS reference images, also run:"
echo "   export BUCKET=\"sceneflow-character-refs\""
echo "   gcloud storage buckets add-iam-policy-binding \"gs://\$BUCKET\" \\"
echo "     --member=\"serviceAccount:$SA_EMAIL\" \\"
echo "     --role=\"roles/storage.objectViewer\""
