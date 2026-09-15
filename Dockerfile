# syntax=docker/dockerfile:1

FROM node:24-alpine AS builder

WORKDIR /repo
ENV NX_DAEMON=false

# Copy root manifests first for layer caching
COPY package.json package-lock.json .npmrc .nvmrc nx.json tsconfig.base.json tsconfig.json ./

# Copy workspace manifests needed by the API build
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

# Install dependencies (HUSKY=0 because .git is not in the build context)
RUN HUSKY=0 npm ci

# Copy application sources
COPY apps/api apps/api
COPY packages/shared packages/shared

# Build the API and produce a pruned, self-contained dist.
# Sync TypeScript references first because the build context excludes apps/web
# (deployed separately on Vercel), which can make the sync generator report the
# workspace as out of sync inside the isolated Docker environment.
RUN npx nx sync && npx nx run api:prune

# Install production dependencies inside dist, using the root overrides as the
# single source of truth for security pins. The lockfile emitted by prune-lockfile
# is inconsistent for this repo's cross-workspace hoisting, so it is discarded.
RUN cd apps/api/dist \
  && node -e "const fs=require('fs'); const root=JSON.parse(fs.readFileSync('../../../package.json','utf8')); const dist=JSON.parse(fs.readFileSync('package.json','utf8')); dist.overrides=root.overrides; fs.writeFileSync('package.json', JSON.stringify(dist, null, 2));" \
  && rm -f package-lock.json \
  && npm install --omit=dev --legacy-peer-deps --ignore-scripts --no-audit --no-fund

# --- Runtime stage ---
FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder --chown=node:node /repo/apps/api/dist ./

USER node

# Cloud Run injects PORT at runtime; this documents the expected default.
EXPOSE 8080

CMD ["node", "main.js"]
