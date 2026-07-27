# --- Build stage ---
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency files first for better layer caching
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Copy source and build
COPY backend/ .
RUN npm run build

# --- Production stage ---
FROM node:20-slim

WORKDIR /app

# Dependency files + production-only install
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled output only
COPY --from=builder /app/dist ./dist

EXPOSE 3333

CMD ["node", "dist/main"]
