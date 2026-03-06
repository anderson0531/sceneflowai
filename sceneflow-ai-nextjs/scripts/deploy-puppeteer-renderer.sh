#!/bin/bash

# ==============================================================================
# SceneFlow AI - Cloud Run Puppeteer Renderer Deployment Script
# ==============================================================================
# This script deploys the headless browser rendering infrastructure to GCP:
# 1. Creates a GCS bucket for job specs and outputs
# 2. Builds and pushes the Docker image to Artifact Registry
# 3. Creates a Cloud Run Job for async video rendering with Puppeteer
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Docker installed
# - GCP project with billing enabled
#
# Key Features:
# - Frame-by-frame "Seek, Draw, Commit" rendering
# - Guaranteed watermark rendering via synchronous GPU flush
# - Pre-installed fonts (Inter) for consistent text rendering
# - Software GL rendering via SwiftShader
# ==============================================================================

set -e

# Configuration - customize these values
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
GCS_BUCKET="${GCS_RENDER_BUCKET:-sceneflow-render-jobs}"
ARTIFACT_REPO="${ARTIFACT_REGISTRY_REPO:-sceneflow}"
IMAGE_NAME="puppeteer-renderer"
JOB_NAME="${CLOUD_RUN_PUPPETEER_JOB_NAME:-puppeteer-render-job}"

# Resource configuration for 4K rendering
MEMORY="8Gi"
CPU="4"
TIMEOUT="3600s"  # 1 hour max for long renders

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}SceneFlow AI - Puppeteer Renderer Deployment${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}This deploys a headless browser renderer for:${NC}"
echo -e "  • Deterministic 4K video rendering"
echo -e "  • Guaranteed watermark rendering"
echo -e "  • Frame-perfect quality regardless of user hardware"
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
echo "  Memory:          $MEMORY"
echo "  CPU:             $CPU"
echo "  Timeout:         $TIMEOUT"
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

# Create GCS bucket if it doesn't exist
echo -e "${GREEN}Step 4: Creating GCS bucket...${NC}"
gsutil ls -b gs://${GCS_BUCKET} 2>/dev/null || \
    gsutil mb -l $REGION gs://${GCS_BUCKET}

# Set CORS policy on bucket for browser uploads
echo -e "${GREEN}Step 5: Setting CORS policy on bucket...${NC}"
cat > /tmp/cors.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST"],
    "responseHeader": ["Content-Type", "Content-Range", "Content-Disposition"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set /tmp/cors.json gs://${GCS_BUCKET}

# Configure Docker to use Artifact Registry
echo -e "${GREEN}Step 6: Configuring Docker authentication...${NC}"
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build and push Docker image
echo -e "${GREEN}Step 7: Building Docker image...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="${SCRIPT_DIR}/../docker/puppeteer-renderer"

if [ ! -d "$DOCKER_DIR" ]; then
    echo -e "${RED}ERROR: Docker directory not found at $DOCKER_DIR${NC}"
    echo "Please run this script from the scripts/ directory"
    exit 1
fi

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/${IMAGE_NAME}:latest"

echo "Building image: $IMAGE_URI"
docker build -t $IMAGE_URI $DOCKER_DIR

echo -e "${GREEN}Step 8: Pushing Docker image...${NC}"
docker push $IMAGE_URI

# Create or update Cloud Run Job
echo -e "${GREEN}Step 9: Creating Cloud Run Job...${NC}"
gcloud run jobs describe $JOB_NAME --region=$REGION 2>/dev/null && \
    gcloud run jobs update $JOB_NAME \
        --image=$IMAGE_URI \
        --region=$REGION \
        --task-timeout=$TIMEOUT \
        --max-retries=1 \
        --cpu=$CPU \
        --memory=$MEMORY \
        --set-env-vars="GCS_BUCKET=$GCS_BUCKET" \
        --service-account="${PROJECT_ID}-compute@developer.gserviceaccount.com" \
|| \
    gcloud run jobs create $JOB_NAME \
        --image=$IMAGE_URI \
        --region=$REGION \
        --task-timeout=$TIMEOUT \
        --max-retries=1 \
        --cpu=$CPU \
        --memory=$MEMORY \
        --set-env-vars="GCS_BUCKET=$GCS_BUCKET" \
        --service-account="${PROJECT_ID}-compute@developer.gserviceaccount.com"

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}Resources created:${NC}"
echo "  • Artifact Registry: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}"
echo "  • Docker Image:      $IMAGE_URI"
echo "  • GCS Bucket:        gs://${GCS_BUCKET}"
echo "  • Cloud Run Job:     $JOB_NAME"
echo ""
echo -e "${YELLOW}To trigger a render job:${NC}"
echo "  gcloud run jobs execute $JOB_NAME \\"
echo "    --region=$REGION \\"
echo "    --update-env-vars='JOB_SPEC_PATH=\$BUCKET/job.json,CALLBACK_URL=https://...'"
echo ""
echo -e "${YELLOW}To view job logs:${NC}"
echo "  gcloud run jobs executions list --job=$JOB_NAME --region=$REGION"
echo ""
echo -e "${BLUE}Pro Tip: Add CALLBACK_URL to receive a webhook when rendering completes.${NC}"
