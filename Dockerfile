# Multi-stage Dockerfile for GoNax Backend
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy source files
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY data ./data
COPY models ./models

# Compile TypeScript
RUN npm run build

# Production Runner Stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user
RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup

# Install production dependencies only
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy compiled files and assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/models ./models

# Create backup directory with permissions
RUN mkdir -p /app/data/backups && chown -R nodeuser:nodegroup /app

USER nodeuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health/ready || exit 1

CMD ["node", "dist/server.js"]
