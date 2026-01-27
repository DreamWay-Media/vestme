# 🔧 Fixing Supabase Environment Variables on DigitalOcean

This guide shows you how to fix the "Missing Supabase environment variables" error on your DigitalOcean deployment.

## 🎯 The Problem

Vite needs the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables **at build time** (when Docker builds your image), not just at runtime. The Dockerfile has been updated to accept these as build arguments.

---

## ✅ Solution by Deployment Method

### Option 1: DigitalOcean Droplet (Manual Deployment)

#### Step 1: SSH into your Droplet
```bash
ssh root@your-droplet-ip
```

#### Step 2: Navigate to your app directory
```bash
cd /path/to/your/app
```

#### Step 3: Pull the latest code
```bash
git pull origin main
```

#### Step 4: Build with environment variables
```bash
# Build the Docker image with build arguments
docker build \
  --build-arg VITE_SUPABASE_URL="https://ahxmsrpmshtjlfgqtyrz.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeG1zcnBtc2h0amxmZ3F0eXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTc4MzAsImV4cCI6MjA3MTM3MzgzMH0.UIFQ0V7E5GImWTYAqSMj5fQZlIyDVvdBKZw74V7fJs0" \
  -t pitch-perfect:latest \
  .
```

#### Step 5: Stop the old container and start the new one
```bash
# Stop and remove old container
docker stop pitch-perfect || true
docker rm pitch-perfect || true

# Run the new container
docker run -d \
  --name pitch-perfect \
  -p 80:3000 \
  --env-file .env \
  --restart unless-stopped \
  pitch-perfect:latest
```

#### Step 6: Verify it's working
```bash
docker logs pitch-perfect
curl http://localhost:80/health
```

---

### Option 2: DigitalOcean App Platform

#### Step 1: Update App Platform Environment Variables

1. Go to your app in DigitalOcean App Platform
2. Click **Settings** → **App-Level Environment Variables**
3. Add these build-time environment variables:

```
VITE_SUPABASE_URL=https://ahxmsrpmshtjlfgqtyrz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeG1zcnBtc2h0amxmZ3F0eXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTc4MzAsImV4cCI6MjA3MTM3MzgzMH0.UIFQ0V7E5GImWTYAqSMj5fQZlIyDVvdBKZw74V7fJs0
```

**Important:** Make sure these are marked as **Build Time** environment variables in the App Platform UI.

#### Step 2: Trigger a new deployment
```bash
# Option A: Push to Git
git push origin main

# Option B: Force rebuild via CLI
doctl apps create-deployment <your-app-id>
```

---

### Option 3: DigitalOcean Container Registry

#### Step 1: Build locally with environment variables
```bash
# From your project root
./scripts/deploy-digitalocean.sh
```

#### Step 2: Tag and push to registry
```bash
# Login to DigitalOcean Container Registry
doctl registry login

# Tag the image
docker tag pitch-perfect:latest registry.digitalocean.com/your-registry/pitch-perfect:latest

# Push to registry
docker push registry.digitalocean.com/your-registry/pitch-perfect:latest
```

#### Step 3: Deploy to your server
```bash
# SSH into your server
ssh root@your-droplet-ip

# Pull and run the new image
docker pull registry.digitalocean.com/your-registry/pitch-perfect:latest
docker stop pitch-perfect || true
docker rm pitch-perfect || true
docker run -d \
  --name pitch-perfect \
  -p 80:3000 \
  --env-file .env \
  --restart unless-stopped \
  registry.digitalocean.com/your-registry/pitch-perfect:latest
```

---

### Option 4: Kubernetes (Advanced)

#### Step 1: Update deployment.yaml
The `k8s/deployment.yaml` file already includes the environment variables, but you need to ensure the image was built with the build args.

#### Step 2: Build and push image with build args
```bash
# Build with build arguments
docker build \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  -t registry.digitalocean.com/your-registry/pitch-perfect:latest \
  .

# Push to registry
docker push registry.digitalocean.com/your-registry/pitch-perfect:latest
```

#### Step 3: Deploy to Kubernetes
```bash
# Apply the deployment
kubectl apply -f k8s/deployment.yaml

# Force a rollout restart
kubectl rollout restart deployment/pitch-perfect
```

---

## 🧪 Testing Locally Before Deploying

Always test your Docker build locally first:

```bash
# Build with build arguments
docker build \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  -t pitch-perfect:test \
  .

# Run locally
docker run -p 3000:3000 --env-file .env pitch-perfect:test

# Test in browser
open http://localhost:3000
```

---

## 🔍 Troubleshooting

### Error still occurs after rebuild?

1. **Verify build arguments were passed:**
```bash
# Check if environment variables are in the built image
docker run pitch-perfect:latest node -e "console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL)"
```

2. **Check the compiled JavaScript:**
```bash
# Look for your Supabase URL in the built files
docker run pitch-perfect:latest grep -r "ahxmsrpmshtjlfgqtyrz" dist/public/
```

3. **Verify .env file on server:**
```bash
# SSH into server and check .env exists
ssh root@your-droplet-ip
cat .env | grep VITE_SUPABASE
```

### Clear Docker cache if needed:
```bash
# Build with no cache
docker build --no-cache \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  -t pitch-perfect:latest \
  .
```

---

## 📋 Quick Reference: Your Environment Variables

```bash
VITE_SUPABASE_URL=https://ahxmsrpmshtjlfgqtyrz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeG1zcnBtc2h0amxmZ3F0eXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTc4MzAsImV4cCI6MjA3MTM3MzgzMH0.UIFQ0V7E5GImWTYAqSMj5fQZlIyDVvdBKZw74V7fJs0
```

---

## 🎯 Summary

The key changes made:
1. ✅ Updated `Dockerfile` to accept `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build arguments
2. ✅ Created `scripts/deploy-digitalocean.sh` for easy deployment
3. ✅ Environment variables now embedded at build time, not runtime

**Remember:** Vite variables (`VITE_*`) are embedded at **BUILD TIME**, so you must pass them when building the Docker image!

