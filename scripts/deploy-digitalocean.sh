#!/bin/bash

# DigitalOcean Deployment Script for PitchPerfect
set -e

echo "🚀 Starting DigitalOcean deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create a .env file with your environment variables"
    exit 1
fi

# Load environment variables
echo "📦 Loading environment variables..."
export $(cat .env | grep -v '^#' | xargs)

# Verify required Vite environment variables
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Error: Missing required Vite environment variables${NC}"
    echo "Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables loaded${NC}"
echo "   VITE_SUPABASE_URL: ${VITE_SUPABASE_URL:0:30}..."
echo "   VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:0:30}..."

# Build Docker image with build arguments
echo -e "\n${YELLOW}🐳 Building Docker image...${NC}"
docker build \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  -t pitch-perfect:latest \
  .

echo -e "${GREEN}✅ Docker image built successfully${NC}"

# Optional: Tag and push to registry
# Uncomment these lines if you're using DigitalOcean Container Registry
# echo -e "\n${YELLOW}📤 Pushing to DigitalOcean Container Registry...${NC}"
# docker tag pitch-perfect:latest registry.digitalocean.com/your-registry/pitch-perfect:latest
# docker push registry.digitalocean.com/your-registry/pitch-perfect:latest
# echo -e "${GREEN}✅ Pushed to registry${NC}"

echo -e "\n${GREEN}🎉 Deployment build complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test locally: docker run -p 3000:3000 --env-file .env pitch-perfect:latest"
echo "2. Push to your DigitalOcean server or container registry"
echo "3. Deploy to your DigitalOcean droplet or App Platform"

