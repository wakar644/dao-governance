# Dockerfile for DAO Project
# Multi-stage build for production

# Stage 1: Build contracts
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY hardhat.config.js ./
COPY contracts/ ./contracts/
COPY scripts/ ./scripts/

# Compile contracts
RUN npx hardhat compile

# Stage 2: Production image
FROM node:18-alpine AS production

WORKDIR /app

# Install curl for healthcheck and serve for frontend
RUN apk add --no-cache curl && npm install -g serve

# Copy built artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/artifacts ./artifacts
COPY --from=builder /app/cache ./cache
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/hardhat.config.js ./
COPY --from=builder /app/contracts ./contracts
COPY --from=builder /app/scripts ./scripts

# Copy frontend
COPY frontend/ ./frontend/

# Expose ports
# 8545 = Hardhat node
# 3000 = Frontend
EXPOSE 8545 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s \
  CMD curl -sf http://localhost:3000 || exit 1

# Default command (can be overridden by docker-compose)
CMD ["sh", "-c", "npx hardhat node & sleep 5 && npx hardhat run scripts/deployV2.js --network localhost && serve -s frontend -l 3000"]
