#!/bin/bash

# ==============================================================================
# SceneFlow AI - Cloud Run FFmpeg Renderer Deployment Script
# ==============================================================================
# This script deploys the FFmpeg rendering infrastructure to GCP:
# 1. Creates a GCS bucket for job specs and outputs
# 2. Builds and pushes the Docker image to Artifact Registry
# 3. Creates a Cloud Run Job for async video rendering
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Docker installed
# - GCP project with billing enabled
# ==============================================================================

set -e

# Configuration - customize these values
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
GCS_BUCKET="${GCS_RENDER_BUCKET:-sceneflow-render-jobs}"
ARTIFACT_REPO="${ARTIFACT_REGISTRY_REPO:-sceneflow}"
IMAGE_NAME="ffmpeg-renderer"
JOB_NAME="${CLOUD_RUN_JOB_NAME:-ffmpeg-render-job}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}SceneFlow AI - FFmpeg Renderer Deployment${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Validate configuration
if [ "$PROJECT_ID" = "your-project-id" ]; then
    echo -e "${RED}ERROR: Please set GCP_PROJECT_ID environment variable${NC}"
    echo "Example: export GCP_PROJECT_ID=my-project-123"
    exit 1
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  Project ID:      $PROJECT_ID"
echo "  Region:          $REGION"
echo "  GCS Bucket:      $GCS_BUCKET"
echo "  Artifact Repo:   $ARTIFACT_REPO"
echo "  Image Name:      $IMAGE_NAME"
echo "  Job Name:        $JOB_NAME"
echo ""

# Confirm before proceeding
read -p "Continue with deployment? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${GREEN}Step 1: Setting up GCP project...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${GREEN}Step 2: Enabling required APIs...${NC}"
gcloud services enable \
    artifactregistry.googleapis.com \
    run.googleapis.com \
    storage.googleapis.com \
    cloudbuild.googleapis.com

# Create Artifact Registry repository if it doesn't exist
echo -e "${GREEN}Step 3: Creating Artifact Registry repository...${NC}"
gcloud artifacts repositories describe $ARTIFACT_REPO --location=$REGION 2>/dev/null || \
    gcloud artifacts repositories create $ARTIFACT_REPO \
        --repository-format=docker \
        --location=$REGION \
        --description="SceneFlow AI container images"

# Configure Docker to use Artifact Registry
echo -e "${GREEN}Step 4: Configuring Docker authentication...${NC}"
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build and push Docker image
echo -e "${GREEN}Step 5: Building Docker image...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="${SCRIPT_DIR}/../docker/ffmpeg-renderer"

if [ ! -d "$DOCKER_DIR" ]; then
    echo -e "${RED}ERROR: Docker directory not found at $DOCKER_DIR${NC}"
    echo "Please run this script from the scripts/ directory"
    exit 1
fi

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/${IMAGE_NAME}:latest"

docker build -t $IMAGE_URI $DOCKER_DIR

echo -e "${GREEN}Step 6: Pushing Docker image to Artifact Registry...${NC}"
docker push $IMAGE_URI

# Create GCS bucket if it doesn't exist
echo -e "${GREEN}Step 7: Creating GCS bucket...${NC}"
gsutil ls -b gs://$GCS_BUCKET 2>/dev/null || \
    gsutil mb -p $PROJECT_ID -l $REGION gs://$GCS_BUCKET

# Set lifecycle policy for automatic cleanup (delete files after 7 days)
cat > /tmp/lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 7}
      }
    ]
  }
}
EOF
gsutil lifecycle set /tmp/lifecycle.json gs://$GCS_BUCKET
rm /tmp/lifecycle.json

# Create Cloud Run Job
echo -e "${GREEN}Step 8: Creating Cloud Run Job...${NC}"
gcloud run jobs describe $JOB_NAME --region=$REGION 2>/dev/null && \
    gcloud run jobs delete $JOB_NAME --region=$REGION --quiet || true

gcloud run jobs create $JOB_NAME \
    --image=$IMAGE_URI \
    --region=$REGION \
    --task-timeout=24h \
    --max-retries=0 \
    --cpu=4 \
    --memory=8Gi \
    --set-env-vars="GCS_BUCKET=$GCS_BUCKET,DATABASE_URL=\${DATABASE_URL}" \
    --service-account="${PROJECT_ID}-compute@developer.gserviceaccount.com"

# Set IAM permissions for the service account
echo -e "${GREEN}Step 9: Configuring IAM permissions...${NC}"
SERVICE_ACCOUNT="${PROJECT_ID}-compute@developer.gserviceaccount.com"

# Grant GCS access
gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}:objectAdmin gs://$GCS_BUCKET

# Grant Cloud Run invoker role
gcloud run jobs add-iam-policy-binding $JOB_NAME \
    --region=$REGION \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/run.invoker"

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}Add these environment variables to your Vercel project:${NC}"
echo ""
echo "  GCS_RENDER_BUCKET=$GCS_BUCKET"
echo "  CLOUD_RUN_JOB_NAME=$JOB_NAME"
echo "  CLOUD_RUN_REGION=$REGION"
echo "  GCP_PROJECT_ID=$PROJECT_ID"
echo ""
echo -e "${YELLOW}For service account authentication, create a key and add:${NC}"
echo ""
echo "  GOOGLE_APPLICATION_CREDENTIALS_JSON=<service-account-key-json>"
echo ""
echo "To test the deployment, trigger a job manually:"
echo "  gcloud run jobs execute $JOB_NAME --region=$REGION --args='test-job-id'"
echo ""
