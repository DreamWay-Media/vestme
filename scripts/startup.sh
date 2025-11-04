#!/bin/sh

# Startup wrapper script for PitchPerfect
set -e

echo "🚀 Starting PitchPerfect application..."

# Set production environment
export NODE_ENV=production

# Verify critical files exist
echo "📁 Verifying application files..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: dist/index.js not found!"
    echo "📁 Current directory: $(pwd)"
    echo "📁 Directory contents:"
    ls -la
    echo "📁 dist/ contents:"
    ls -la dist/ || echo "dist/ directory not found"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "❌ Error: node_modules not found!"
    exit 1
fi

# Verify critical dependencies
echo "📦 Verifying dependencies..."
if [ -d "node_modules/express" ] && [ -d "node_modules/@supabase" ] && [ -d "node_modules/puppeteer" ]; then
    echo "✅ All critical dependencies present"
else
    echo "❌ Missing critical dependencies"
    exit 1
fi

# Start the application
echo "🚀 Launching application..."
exec node dist/index.js
