# 🚀 DigitalOcean Deployment Guide for PitchPerfect

This guide will help you deploy your PitchPerfect application to DigitalOcean.

## 📋 Prerequisites

1. **DigitalOcean Account**: Sign up at [digitalocean.com](https://digitalocean.com)
2. **doctl CLI**: Install the DigitalOcean CLI tool
3. **Docker**: Install Docker on your local machine
4. **Git Repository**: Your code should be in a Git repository

## 🛠️ Installation

### Install doctl CLI

**macOS (using Homebrew):**

```bash
brew install doctl
```

**Linux:**

```bash
snap install doctl
```

**Windows:**
Download from [DigitalOcean releases](https://github.com/digitalocean/doctl/releases)

### Authenticate with DigitalOcean

```bash
doctl auth init
# Enter your DigitalOcean API token when prompted
```

## 🚀 Deployment Options

### Option 1: DigitalOcean App Platform (Recommended)

1. **Update the app configuration:**
   - Edit `.do/app.yaml`
   - Update the GitHub repository details
   - Set your environment variables

2. **Deploy:**
   ```bash
   ./deploy.sh
   ```

### Option 2: DigitalOcean Droplet with Docker

1. **Create a Droplet:**

   ```bash
   doctl compute droplet create pitch-perfect \
     --size s-1vcpu-1gb \
     --image ubuntu-22-04-x64 \
     --region nyc1
   ```

2. **SSH into the Droplet:**

   ```bash
   doctl compute droplet ssh pitch-perfect
   ```

3. **Install Docker and deploy:**

   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh

   # Clone your repository
   git clone <your-repo-url>
   cd <your-repo-name>

   # Build and run
   docker build -t pitch-perfect .
   docker run -d -p 80:3000 --env-file .env.production pitch-perfect
   ```

### Option 3: DigitalOcean Kubernetes (Advanced)

1. **Create a Kubernetes cluster:**

   ```bash
   doctl kubernetes cluster create pitch-perfect-cluster \
     --region nyc1 \
     --size s-1vcpu-2gb \
     --count 2
   ```

2. **Deploy using kubectl:**
   ```bash
   kubectl apply -f k8s/
   ```

## 🔧 Environment Variables

Create a `.env.production` file with your production values:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=your_production_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
# ... other variables
```

## 📦 Build and Test Locally

Before deploying, test your production build:

```bash
# Build the application
npm run build

# Test production build locally
npm run start:prod

# Test Docker build
npm run docker:build
npm run docker:run
```

## 🌐 Domain and SSL

1. **Add a domain in DigitalOcean:**
   - Go to Networking → Domains
   - Add your domain

2. **Configure SSL:**
   - DigitalOcean App Platform provides automatic SSL
   - For Droplets, use Let's Encrypt with Certbot

## 📊 Monitoring and Logs

### App Platform

```bash
# View app status
doctl apps list

# View logs
doctl apps logs <app-id>

# Scale your app
doctl apps update <app-id> --spec .do/app.yaml
```

### Droplet

```bash
# View Docker logs
docker logs <container-id>

# Monitor resources
htop
df -h
```

## 🔄 Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to DigitalOcean
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to DigitalOcean
        uses: digitalocean/app_action@main
        with:
          app_name: pitch-perfect
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures:**
   - Check Node.js version (use Node 20+)
   - Verify all dependencies are in package.json

2. **Environment Variables:**
   - Ensure all required variables are set
   - Check variable names match exactly

3. **Port Conflicts:**
   - Verify PORT environment variable is set
   - Check if port 3000 is available

4. **Database Connection:**
   - Verify DATABASE_URL is correct
   - Check database accessibility from DigitalOcean

### Debug Commands

```bash
# Check app status
doctl apps list

# View detailed app info
doctl apps get <app-id>

# Check environment variables
doctl apps get <app-id> --format Spec.Env

# View build logs
doctl apps logs <app-id> --type build
```

## 📈 Scaling

### App Platform

```bash
# Scale horizontally
doctl apps update <app-id> --spec .do/app.yaml

# Update instance size
# Edit .do/app.yaml and redeploy
```

### Droplet

```bash
# Scale vertically
doctl compute droplet resize <droplet-id> --size s-2vcpu-2gb

# Scale horizontally
# Create load balancer and multiple droplets
```

## 🔒 Security Best Practices

1. **Environment Variables:**
   - Never commit sensitive data to Git
   - Use DigitalOcean's encrypted environment variables

2. **Network Security:**
   - Configure firewall rules
   - Use private networking for database connections

3. **Container Security:**
   - Run containers as non-root user
   - Keep base images updated
   - Scan for vulnerabilities

## 📞 Support

- **DigitalOcean Documentation**: [docs.digitalocean.com](https://docs.digitalocean.com)
- **Community**: [DigitalOcean Community](https://www.digitalocean.com/community)
- **Support**: [DigitalOcean Support](https://www.digitalocean.com/support)

---

**Happy Deploying! 🚀**
