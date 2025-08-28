#!/bin/bash

# Docker build script for PitchPerfect
set -e

echo "🚀 Starting Docker build..."

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Set production mode
export NODE_ENV=production

# Verify we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Current directory: $(pwd)"
    exit 1
fi

echo "📁 Working directory: $(pwd)"
echo "📦 Package.json found: $(cat package.json | grep '"name"' | head -1)"

# Build the application
echo "📦 Building application..."
npm run build

# Verify build output
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: Build failed - dist/index.js not found"
    exit 1
fi

echo "✅ Docker build completed successfully!"
echo "📁 Build output: dist/"
echo "📊 Build size: $(du -h dist/index.js | cut -f1)"
echo "🚀 Ready for deployment!"
