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

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
npx vercel --prod

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed."
    exit 1
fi

echo "✅ Deployment successful"

# Health check
echo "🏥 Running health check..."
sleep 10
curl -f https://your-domain.vercel.app/api/health

if [ $? -ne 0 ]; then
    echo "❌ Health check failed"
    exit 1
fi

echo "✅ Health check passed"

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
