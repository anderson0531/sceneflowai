#!/bin/bash

# SceneFlow AI Startup Script

echo "🎬 Starting SceneFlow AI..."
echo "=========================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if http-server is installed
if ! command -v http-server &> /dev/null; then
    echo "📦 Installing http-server..."
    npm install -g http-server
fi

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🚀 Starting development server..."
echo "   Open your browser and navigate to: http://localhost:8000"
echo "   Press Ctrl+C to stop the server"
echo ""

http-server -p 8000 -c-1 --cors
