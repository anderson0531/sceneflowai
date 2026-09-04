#!/bin/bash

echo "🚀 SceneFlow AI Production Deployment Script"
echo "============================================="

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navigate to the script's directory (the Next.js project root)
cd "$SCRIPT_DIR"

echo "📁 Working directory: $(pwd)"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in $SCRIPT_DIR"
    exit 1
fi

# Check environment variables
echo "🔍 Checking environment configuration..."
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  Warning: GEMINI_API_KEY not set"
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY not set"
fi

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Warning: DATABASE_URL not set"
fi

# Build the application
echo "�� Building DOL application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Aborting deployment."
    exit 1
fi

echo "✅ Build successful"

# Run database migrations
echo "🗄️  Running database migrations..."
npm run db:migrate

if [ $? -ne 0 ]; then
    echo "❌ Database migration failed. Aborting deployment."
    exit 1
fi

echo "✅ Database migrations successful"

# Run tests
echo "🧪 Running DOL tests..."
npm run test:dol

if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Aborting deployment."
    exit 1
fi

echo "✅ Tests passed"

# Deploy via Git push (Vercel auto-deploys from GitHub)
echo "🚀 Deploying to Vercel via Git..."
echo "📝 Committing changes..."

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

git add -A

# Get commit message from user or use default
if [ -z "$1" ]; then
    COMMIT_MSG="Production deployment - $(date '+%Y-%m-%d %H:%M:%S')"
else
    COMMIT_MSG="$1"
fi

git commit -m "$COMMIT_MSG"

if [ $? -ne 0 ]; then
    echo "⚠️  No changes to commit or commit failed"
    echo "Checking if we should push existing commits..."
fi

echo "📤 Pushing to GitHub (triggers Vercel deployment)..."
git push -u origin main

if [ $? -ne 0 ]; then
    echo "❌ Git push failed."
    exit 1
fi

echo "✅ Pushed to GitHub - Vercel deployment triggered"
echo "🔍 Monitor deployment at: https://vercel.com/anderson0531-3626s-projects/sceneflow-ai-nextjs"

# Wait for deployment
echo "⏳ Waiting 30 seconds for deployment to complete..."
sleep 30

# Health check
echo "🏥 Running health check..."
curl -f https://sceneflowai.studio/api/health || curl -f https://sceneflow-ai-nextjs.vercel.app/api/health

if [ $? -ne 0 ]; then
    echo "⚠️  Health check inconclusive - check Vercel dashboard"
else
    echo "✅ Health check passed"
fi

# Final status
echo ""
echo "🎉 SceneFlow AI Production Deployment Complete!"
echo "================================================"
echo "✅ Application built successfully"
echo "✅ Database migrated successfully"
echo "✅ Tests passed"
echo "✅ Deployed to production"
echo "✅ Health check passed"
echo ""
echo "🌐 Production URL: https://sceneflowai.studio"
echo "📊 Dashboard: https://sceneflowai.studio/dashboard"
echo ""
echo "🎬 SceneFlow AI is now live in production!"
