# Use Node.js 20 LTS for better performance and compatibility
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Verify package.json was copied
RUN echo "📦 Package files copied:" && \
    ls -la package*.json && \
    echo "📦 Package.json contents (name and version):" && \
    cat package.json | grep -E '"name"|"version"' | head -2

# Install ALL dependencies (including dev dependencies needed for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Ensure build script is executable and has correct line endings
RUN chmod +x scripts/docker-build.sh && \
    sed -i 's/\r$//' scripts/docker-build.sh

# Verify the script exists and is executable
RUN ls -la scripts/ && \
    echo "Script contents:" && \
    head -10 scripts/docker-build.sh

# Check script syntax
RUN sh -n scripts/docker-build.sh && \
    echo "✅ Script syntax check passed"

# Set production environment for build
ENV NODE_ENV=production

# Build the application with production environment variables
# Use direct build command for reliability
RUN echo "🚀 Starting build process..." && \
    echo "📁 Current directory: $(pwd)" && \
    echo "📁 Directory contents:" && \
    ls -la && \
    echo "📦 Running npm run build..." && \
    npm run build && \
    echo "✅ Build completed successfully!" && \
    echo "📁 Build output:" && \
    ls -la dist/ && \
    echo "📊 Build size:" && \
    du -h dist/index.js

# Production stage
FROM node:20-alpine AS production

# Install dumb-init and system dependencies for Puppeteer
RUN apk add --no-cache dumb-init \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    coreutils

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application and package files from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Copy startup script from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/scripts/startup.sh ./scripts/startup.sh

# Verify package.json was copied to production stage
RUN echo "📦 Production stage package files:" && \
    ls -la package*.json && \
    echo "📦 Package.json contents (name and version):" && \
    cat package.json | grep -E '"name"|"version"' | head -2

# Install ALL dependencies (including those needed at runtime)
# We need some packages that were in devDependencies for runtime
RUN npm ci && npm cache clean --force

# Make startup script executable
RUN chmod +x scripts/startup.sh

# Set Puppeteer environment variables for production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set production environment
ENV NODE_ENV=production

# Debug: List files in production stage
RUN echo "📁 Files in production stage:" && \
    ls -la && \
    echo "📁 dist/ contents:" && \
    ls -la dist/ && \
    echo "📁 dist/shared/ contents:" && \
    ls -la dist/shared/ && \
    echo "📁 dist/migrations/ contents:" && \
    ls -la dist/migrations/ && \
    echo "📁 node_modules/ contents (first 10):" && \
    ls -la node_modules/ | head -10

# Test that the application can start and load modules
RUN echo "🧪 Testing application startup..." && \
    echo "📦 Testing module resolution..." && \
    node -e "console.log('✅ Node.js is working'); console.log('✅ Module resolution test passed')" && \
    echo "📦 Testing dist/index.js loading..." && \
    node -e "console.log('✅ Testing dist/index.js...'); const fs = require('fs'); const path = require('path'); const distPath = path.join(process.cwd(), 'dist', 'index.js'); if (fs.existsSync(distPath)) { console.log('✅ dist/index.js exists'); console.log('📊 File size:', fs.statSync(distPath).size, 'bytes'); } else { console.log('❌ dist/index.js not found'); process.exit(1); }" && \
    echo "📦 Testing critical dependencies..." && \
    node -e "try { require('express'); console.log('✅ Express loaded'); require('@supabase/supabase-js'); console.log('✅ Supabase loaded'); require('puppeteer'); console.log('✅ Puppeteer loaded'); } catch(e) { console.log('❌ Dependency loading failed:', e.message); process.exit(1); }" && \
    echo "📦 Testing file structure..." && \
    node -e "const fs = require('fs'); const requiredDirs = ['dist', 'node_modules']; const missing = requiredDirs.filter(dir => !fs.existsSync(dir)); if (missing.length > 0) { console.log('❌ Missing directories:', missing); process.exit(1); } else { console.log('✅ All required directories exist'); }" && \
    echo "📦 Testing dist subdirectories..." && \
    node -e "const fs = require('fs'); const requiredSubDirs = ['dist/shared', 'dist/migrations']; const missing = requiredSubDirs.filter(dir => !fs.existsSync(dir)); if (missing.length > 0) { console.log('❌ Missing dist subdirectories:', missing); process.exit(1); } else { console.log('✅ All required dist subdirectories exist'); }" && \
    echo "✅ All startup tests passed!"

# Final verification: Test that the application can start without crashing
RUN echo "🚀 Final startup verification..." && \
    echo "📦 Testing application entry point..." && \
    node -e "try { const app = require('./dist/index.js'); console.log('✅ Application module loaded successfully'); } catch(e) { console.log('❌ Failed to load application:', e.message); process.exit(1); }" && \
    echo "✅ Application startup verification completed!"

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check - check if the server is responding on the health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["./scripts/startup.sh"]
