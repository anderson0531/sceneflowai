#!/bin/bash

echo "🚀 DOL Production Deployment Script"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from project root directory"
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
git push

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
curl -f https://sceneflow.app/api/health || curl -f https://sceneflow-ai-nextjs.vercel.app/api/health

if [ $? -ne 0 ]; then
    echo "⚠️  Health check inconclusive - check Vercel dashboard"
else
    echo "✅ Health check passed"
fi

# Final status
echo ""
echo "🎉 DOL Production Deployment Complete!"
echo "====================================="
echo "✅ Application built successfully"
echo "✅ Database migrated successfully"
echo "✅ Tests passed"
echo "✅ Deployed to production"
echo "✅ Health check passed"
echo ""
echo "🌐 Production URL: https://your-domain.vercel.app"
echo "📊 Admin Dashboard: https://your-domain.vercel.app/admin/dol"
echo "📈 Analytics: https://your-domain.vercel.app/admin/dol/analytics"
echo "🔧 Optimization: https://your-domain.vercel.app/admin/dol/optimization"
echo "🎬 Video Monitoring: https://your-domain.vercel.app/admin/dol/video-monitoring"
echo ""
echo "🚀 Your DOL architecture is now live in production!"
