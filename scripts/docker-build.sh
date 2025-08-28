#!/bin/bash

# Docker build script for PitchPerfect
set -e

echo "🚀 Starting Docker build..."

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Set production mode
export NODE_ENV=production

# Build the application
echo "📦 Building application..."
npm run build

echo "✅ Docker build completed successfully!"
echo "📁 Build output: dist/"
echo "🚀 Ready for deployment!"
