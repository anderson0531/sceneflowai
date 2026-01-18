#!/bin/bash
# =============================================================================
# GCS Assets Bucket Setup Script
# 
# Creates the sceneflow-assets bucket with proper lifecycle policies for
# cost optimization using Google Startup credits.
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - GCP project ID set (GCP_PROJECT_ID environment variable)
# =============================================================================

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-sceneflowai-2d3e6}"
BUCKET_NAME="${GCS_ASSETS_BUCKET:-sceneflow-assets}"
REGION="us-central1"

echo "=============================================="
echo "GCS Assets Bucket Setup"
echo "=============================================="
echo "Project: $PROJECT_ID"
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project
gcloud config set project "$PROJECT_ID"

# Check if bucket already exists
if gsutil ls -b "gs://$BUCKET_NAME" &> /dev/null; then
    echo "⚠️  Bucket gs://$BUCKET_NAME already exists"
else
    echo "📦 Creating bucket gs://$BUCKET_NAME..."
    gsutil mb -p "$PROJECT_ID" -l "$REGION" -b on "gs://$BUCKET_NAME"
    echo "✅ Bucket created"
fi

# Create lifecycle policy JSON
echo "📝 Setting lifecycle policy..."
cat > /tmp/lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "NEARLINE"
        },
        "condition": {
          "age": 90,
          "matchesPrefix": ["projects/"]
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "COLDLINE"
        },
        "condition": {
          "age": 365,
          "matchesPrefix": ["projects/"]
        }
      },
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": 730,
          "matchesPrefix": ["projects/"]
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set /tmp/lifecycle.json "gs://$BUCKET_NAME"
echo "✅ Lifecycle policy applied"
echo "   - Move to Nearline after 90 days"
echo "   - Move to Coldline after 365 days"
echo "   - Delete after 730 days (2 years)"

# Set CORS for browser access
echo "🌐 Setting CORS configuration..."
cat > /tmp/cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set /tmp/cors.json "gs://$BUCKET_NAME"
echo "✅ CORS configured for browser access"

# Ensure uniform bucket-level access (recommended)
echo "🔒 Ensuring uniform bucket-level access..."
gsutil uniformbucketlevelaccess set on "gs://$BUCKET_NAME"
echo "✅ Uniform bucket-level access enabled"

# Verify bucket configuration
echo ""
echo "=============================================="
echo "Bucket Configuration Summary"
echo "=============================================="
echo ""
echo "Bucket: gs://$BUCKET_NAME"
gsutil ls -L -b "gs://$BUCKET_NAME" | grep -E "Location|Storage class|Lifecycle|Bucket Policy Only"

# Display environment variables to add
echo ""
echo "=============================================="
echo "Environment Variables"
echo "=============================================="
echo ""
echo "Add these to your .env.local and Vercel:"
echo ""
echo "  GCS_ASSETS_BUCKET=$BUCKET_NAME"
echo ""

# Cleanup
rm -f /tmp/lifecycle.json /tmp/cors.json

echo "✅ Setup complete!"
