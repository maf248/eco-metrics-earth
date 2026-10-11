# syntax=docker/dockerfile:1

FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS builder

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

# Install production dependencies inside dist from the pruned lockfile, which is
# authoritative: the root overrides (security pins) are already resolved in it,
# so `npm ci` installs exactly those versions and fails if it is inconsistent.
RUN cd apps/api/dist && npm ci --omit=dev --ignore-scripts --no-audit --no-fund

# --- Runtime stage ---
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1

# The runtime only runs `node main.js`; dependencies are installed in the
# builder. Removing the bundled package managers drops their CVEs from the image.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
      /opt/yarn-v* /usr/local/bin/yarn /usr/local/bin/yarnpkg

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder --chown=node:node /repo/apps/api/dist ./

USER node

# Cloud Run injects PORT at runtime; this documents the expected default.
EXPOSE 8080

CMD ["node", "main.js"]
