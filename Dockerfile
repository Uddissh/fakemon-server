# ============================================================
# Fakemon Chaos — Auth Server Dockerfile
# Repo:  fakemon-server (Uddissh)
# ============================================================

FROM node:20-alpine

# Install curl for healthchecks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/
COPY drizzle.config.ts ./
COPY drizzle/ ./drizzle/

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start command
CMD ["node", "src/index.js"]
