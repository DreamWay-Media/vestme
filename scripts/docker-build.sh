#!/bin/sh

# Docker build script for PitchPerfect
set -e

echo "🚀 Starting Docker build..."

# Get the absolute path to the script directory (more compatible with sh)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "📁 Script directory: $SCRIPT_DIR"
echo "📁 Project root: $PROJECT_ROOT"

# Change to project root
cd "$PROJECT_ROOT"

# Set production mode
export NODE_ENV=production

# Verify we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Current directory: $(pwd)"
    echo "📁 Current directory contents:"
    ls -la
    echo "📁 Parent directory contents:"
    ls -la ../
    echo "📁 Root directory contents:"
    ls -la /
    exit 1
fi

echo "📁 Working directory: $(pwd)"
echo "📦 Package.json found: $(cat package.json | grep '"name"' | head -1)"
echo "📦 Package.json path: $(realpath package.json)"

# Verify node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Error: node_modules not found. Installing dependencies..."
    npm install
fi

# Build the application
echo "📦 Building application..."
npm run build

# Verify build output
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: Build failed - dist/index.js not found"
    echo "📁 Contents of dist/:"
    ls -la dist/ || echo "dist/ directory not found"
    exit 1
fi

echo "✅ Docker build completed successfully!"
echo "📁 Build output: dist/"
echo "📊 Build size: $(du -h dist/index.js | cut -f1)"
echo "🚀 Ready for deployment!"
