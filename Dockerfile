# Use Node.js 20 LTS for better performance and compatibility
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

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
    head -5 scripts/docker-build.sh

# Set production environment for build
ENV NODE_ENV=production

# Build the application with production environment variables
# Use absolute path to ensure script is found, with robust fallback
RUN /bin/sh scripts/docker-build.sh || (echo "Script failed, trying direct build..." && npm run build)

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy environment file template
COPY --from=builder --chown=nextjs:nodejs /app/.env.example ./.env.example

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check - check if the server is responding on the health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
