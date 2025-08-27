#!/bin/bash

# Production build script for PitchPerfect
set -e

echo "🚀 Starting production build..."

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Load environment variables from client .env file
if [ -f "client/.env" ]; then
    echo "📁 Loading client environment variables..."
    export $(cat client/.env | grep -v '^#' | xargs)
fi

# Load environment variables from root .env file
if [ -f ".env.production" ]; then
    echo "📁 Loading production environment variables..."
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Set production mode
export NODE_ENV=production

# Build the application
echo "📦 Building application..."
npm run build

echo "✅ Production build completed successfully!"
echo "📁 Build output: dist/"
echo "🚀 Ready for deployment!"
