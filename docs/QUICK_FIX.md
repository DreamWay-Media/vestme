# 🚀 Quick Fix for DigitalOcean

## The One Command Fix

SSH into your DigitalOcean server and run:

```bash
# Navigate to your app
cd /path/to/vestme

# Pull latest code (includes Dockerfile fix)
git pull

# Build with environment variables
docker build \
  --build-arg VITE_SUPABASE_URL="https://ahxmsrpmshtjlfgqtyrz.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeG1zcnBtc2h0amxmZ3F0eXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTc4MzAsImV4cCI6MjA3MTM3MzgzMH0.UIFQ0V7E5GImWTYAqSMj5fQZlIyDVvdBKZw74V7fJs0" \
  -t pitch-perfect:latest .

# Restart the container
docker stop pitch-perfect && docker rm pitch-perfect
docker run -d --name pitch-perfect -p 80:3000 --env-file .env --restart unless-stopped pitch-perfect:latest
```

That's it! ✅

---

## What Changed?

- ✅ `Dockerfile` now accepts build arguments for Vite environment variables
- ✅ Environment variables are embedded during build (not runtime)
- ✅ Created deployment scripts and comprehensive guides

## Need More Help?

See `DIGITALOCEAN_SUPABASE_FIX.md` for detailed instructions for all deployment methods.

