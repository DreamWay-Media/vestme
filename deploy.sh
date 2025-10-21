#!/bin/bash

# Deployment script for PitchPerfect to DigitalOcean
set -e

echo "🚀 Starting deployment to DigitalOcean..."

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl CLI is not installed. Please install it first:"
    echo "   https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if user is authenticated
if ! doctl auth list &> /dev/null; then
    echo "❌ Please authenticate with DigitalOcean first:"
    echo "   doctl auth init"
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run build

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t pitch-perfect:latest .

# Tag for DigitalOcean Container Registry (optional)
echo "🏷️  Tagging image..."
docker tag pitch-perfect:latest registry.digitalocean.com/your-registry/pitch-perfect:latest

# Push to DigitalOcean Container Registry (optional)
echo "⬆️  Pushing to DigitalOcean Container Registry..."
docker push registry.digitalocean.com/your-registry/pitch-perfect:latest

# Deploy using DigitalOcean App Platform
echo "🚀 Deploying to DigitalOcean App Platform..."
doctl apps create --spec .do/app.yaml

echo "✅ Deployment completed!"
echo "🌐 Your app should be available at the URL provided by DigitalOcean"
echo "📊 Monitor deployment: doctl apps list"
