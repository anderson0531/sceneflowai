#!/bin/bash

echo "🔧 Fixing Vercel deployment issues for SceneFlow AI..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install Vercel CLI globally if not installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
else
    echo "✅ Vercel CLI already installed"
fi

# Install project dependencies
echo "📦 Installing project dependencies..."
npm install

# Make build script executable
echo "🔧 Making build script executable..."
chmod +x build-vercel.js

# Test build locally
echo "🧪 Testing build locally..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Check if dist directory exists and has content
    if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
        echo "✅ Build directory created with content"
        echo "📁 Build directory contents:"
        ls -la dist/
    else
        echo "❌ Build directory is empty or missing"
        exit 1
    fi
else
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi

# Check Vercel configuration
echo "🔍 Checking Vercel configuration..."
if [ -f "vercel.json" ]; then
    echo "✅ vercel.json found"
else
    echo "❌ vercel.json missing"
    exit 1
fi

# Check .gitignore
echo "🔍 Checking .gitignore..."
if [ -f ".gitignore" ]; then
    echo "✅ .gitignore found"
else
    echo "❌ .gitignore missing"
    exit 1
fi

echo ""
echo "🎉 All checks passed! Your SceneFlow AI app is ready for Vercel deployment."
echo ""
echo "🚀 To deploy:"
echo "   1. npm run deploy:preview  (for preview)"
echo "   2. npm run deploy          (for production)"
echo ""
echo "📖 For detailed instructions, see VERCEL_DEPLOYMENT.md"
echo ""
echo "🔧 If you encounter issues:"
echo "   1. Check VERCEL_DEPLOYMENT.md"
echo "   2. Run: vercel logs [deployment-url]"
echo "   3. Ensure all environment variables are set"
