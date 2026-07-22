# --- Build stage ---
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# --- Production stage ---
FROM node:20-slim

WORKDIR /app

# Dependency files + production-only install
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled output only — no src/.env baked into the image.
# Migrations are a separate, deliberate step (see README) — run
# `npm run migration:run` from a machine with devDependencies (ts-node),
# not from this runtime image.
COPY --from=builder /app/dist ./dist

EXPOSE 3333

CMD ["node", "dist/main"]
