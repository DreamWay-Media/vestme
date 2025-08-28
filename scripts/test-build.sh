#!/bin/bash

# Test build script for PitchPerfect
set -e

echo "🧪 Testing build process..."

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/

# Test the build
echo "📦 Testing build..."
npm run build

# Verify build output
echo "✅ Verifying build output..."
if [ -f "dist/index.js" ]; then
    echo "✅ dist/index.js exists"
    ls -la dist/
else
    echo "❌ dist/index.js not found"
    exit 1
fi

echo "🎉 Build test completed successfully!"
