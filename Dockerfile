# Multi-stage Dockerfile for TON Business Suite
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY tsconfig.json ./
COPY .eslintrc.js ./
COPY .prettierrc ./

# Install all dependencies including devDependencies
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S tonapp -u 1001

# Copy built application
COPY --from=builder --chown=tonapp:nodejs /app/dist ./dist
COPY --from=builder --chown=tonapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=tonapp:nodejs /app/package*.json ./

# Switch to non-root user
USER tonapp

# Expose port
EXPOSE 3000 3001 3002 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]