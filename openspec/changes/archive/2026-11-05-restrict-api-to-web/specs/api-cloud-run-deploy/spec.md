## ADDED Requirements

### Requirement: Production backend URL is not in tracked files

No tracked file (excluding `openspec/changes/archive/`) SHALL contain the production Cloud Run URL. `README.md` SHALL NOT present an API base URL as public, `apps/api/src/main.ts` SHALL NOT add the production URL as a Swagger server, and documentation examples SHALL use generic placeholders. The real URL lives only in deploy-time configuration (Vercel `API_BASE_URL`).

#### Scenario: No occurrences of the production URL

- **WHEN** the repository is searched for a Cloud Run service URL (regex `eco-metrics-api(-dev)?-[a-z0-9]+-[a-z]+\.a\.run\.app`)
- **THEN** there are no matches outside `openspec/changes/archive/` and `.git`

## MODIFIED Requirements

### Requirement: Cloud Run service is configured for scale-to-zero with a health startup probe

The workflow SHALL deploy with `google-github-actions/deploy-cloudrun@v3` to the target's service (`eco-metrics-api` for `production`, `eco-metrics-api-dev` for `development`) in the region from `GCP_REGION`. Both services SHALL receive the same configuration, differing only in the CORS values: a startup probe on `GET /api/v1/health` (container port 8080, e.g. `--startup-probe=httpGet.path=/api/v1/health,httpGet.port=8080,periodSeconds=2,timeoutSeconds=2,failureThreshold=15`); `--min-instances=0` (explicit scale-to-zero); `--allow-unauthenticated` (access control is at the application level: the API rejects requests without a valid `X-Internal-Api-Key`, see `api-security-hardening`); a hard instance cap `--max-instances=<n>` resolved in the same single target mapping as the service name (`2` for `production`, `1` for `development`); explicit resource defaults (`--cpu=1 --memory=512Mi`, free-tier-safe); and env vars `NODE_ENV=production`, `CORS_ORIGIN` (from the target's origin variable — `CORS_ORIGIN` for `production`, `CORS_ORIGIN_DEV` for `development` — a comma-separated list of allowed origins; the workflow escapes `\` and `,` per the deploy action's documented `env_vars` escaping rules so a multi-origin list reaches the service intact instead of being split into bogus entries), `CORS_ORIGIN_PATTERN` (from the target's optional pattern variable — `CORS_ORIGIN_PATTERN` or `CORS_ORIGIN_PATTERN_DEV` — escaped the same way, passed only when the variable is set), `SWAGGER_ENABLED=false`. The workflow SHALL NEVER set a `PORT` env var (Cloud Run injects `PORT=8080`; the app reads it via `AppConfigService.port` and Joi coerces the string). The deploy step's built-in deploy health check (default on) SHALL be relied upon: if the startup probe fails, the workflow fails and traffic stays on the last healthy revision.

#### Scenario: PORT is injected, never configured

- **WHEN** the Cloud Run service configuration is inspected after deploy
- **THEN** `PORT` is not present in the service's env vars — Cloud Run injects it into the container at runtime
- **AND** the app listens on the injected port (Joi `Joi.number().port()` coerces the `8080` string)

#### Scenario: Startup probe gates traffic

- **GIVEN** a revision whose container fails to start (e.g., a bad image, or an invalid `CORS_ORIGIN`/`CORS_ORIGIN_PATTERN` value that fails Joi validation at boot)
- **WHEN** the deploy runs
- **THEN** the startup probe never passes, the deploy step fails, and the previous healthy revision keeps serving traffic

#### Scenario: Scale to zero between traffic

- **WHEN** the service receives no requests
- **THEN** Cloud Run scales the instance count to zero (no idle billing)
- **AND** the next request pays a cold start of several seconds (~6–7 s measured on 2026-10-09)
- **AND** the web app absorbs it with a second fetch attempt and never caches a failed fetch (see `water-footprint-page`)

#### Scenario: CORS allows the Vercel production origin

- **GIVEN** `CORS_ORIGIN` set to the Vercel production URL in the GitHub variables
- **WHEN** a browser request from that origin hits any route of the production service (e.g. the Swagger UI in a dev-enabled deployment)
- **THEN** the response carries the appropriate `Access-Control-Allow-Origin` header

#### Scenario: Comma-separated CORS_ORIGIN deploys intact

- **GIVEN** `CORS_ORIGIN` (or `CORS_ORIGIN_DEV`) set to a multi-origin list (e.g. `http://localhost:3000,https://eco-metrics-earth.vercel.app`) in the GitHub variables
- **WHEN** the deploy for the matching target runs
- **THEN** the service's `CORS_ORIGIN` env var contains the full comma-separated list — the value is not split at the first comma into a bogus env var entry
- **AND** a browser request from the second origin receives the appropriate `Access-Control-Allow-Origin` header

#### Scenario: Preview origins allowed when the pattern variable is set

- **GIVEN** `CORS_ORIGIN_PATTERN_DEV` set to an anchored Vercel preview regex (e.g. `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$`) in the GitHub variables
- **WHEN** a browser request from a matching preview origin hits any route of the development service
- **THEN** the response carries the appropriate `Access-Control-Allow-Origin` header

#### Scenario: Targets never share CORS values

- **GIVEN** different values in `CORS_ORIGIN` and `CORS_ORIGIN_DEV`
- **WHEN** each target deploys
- **THEN** `eco-metrics-api` receives only the production values and `eco-metrics-api-dev` receives only the `_DEV` values

#### Scenario: Both services have a hard instance cap

- **WHEN** the deploy for each target runs
- **THEN** `eco-metrics-api` is deployed with `--max-instances=2` and `eco-metrics-api-dev` with `--max-instances=1`
- **AND** load beyond the cap degrades (`429`/`503`) instead of scaling further

### Requirement: Multi-stage Docker image builds a self-contained apps/api runtime

A `Dockerfile` SHALL exist at the repository root (build context = repo root). It SHALL be multi-stage with both stages based on `node:24-alpine` (matching `.nvmrc`) **pinned by digest**: each `FROM` line SHALL read `node:24-alpine@sha256:<digest>`, keeping the readable tag next to the digest, and both stages SHALL use the same digest. The digest SHALL be the multi-arch image index (manifest list) digest of the tag, not a single-platform manifest digest, so the build resolves the right platform on any runner. The digest is kept current by Dependabot (see the `dependency-updates` capability), so OS and Node security patches are not frozen.

The **builder stage** SHALL, in order: copy the root manifests (`package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `nx.json`, `tsconfig.base.json`, `tsconfig.json`) and the workspace manifests (`apps/api/package.json`, `packages/shared/package.json`) first (layer-cache friendly); run `HUSKY=0 npm ci` (full install — NX and webpack are dev dependencies; `HUSKY=0` because `.git` is not in the context, mirroring the `release.yml` convention; `legacy-peer-deps` comes from the copied `.npmrc`); copy the `apps/api` and `packages/shared` sources; run `npx nx run api:prune` (which triggers `build` → `prune-lockfile` → `copy-workspace-modules` and emits `apps/api/dist` with `main.js`, `data/water-footprint.json`, a pruned `package.json` carrying `"@eco-metrics/shared": "file:./workspace_modules/@eco-metrics/shared"`, a pruned `package-lock.json`, and `workspace_modules/@eco-metrics/shared` including its built `dist/`); then install the runtime dependencies **inside** `apps/api/dist` with `npm ci --omit=dev --ignore-scripts` (plus `--no-audit --no-fund`) **from the pruned `package-lock.json` emitted by `prune-lockfile`**, so every transitive dependency resolves to the exact version recorded in the root lockfile. The Dockerfile SHALL NOT delete or regenerate the pruned lockfile, SHALL NOT use `npm install` for the dist install, and SHALL NOT use `--legacy-peer-deps` for it. The root `overrides` block (security pins) SHALL NOT be copied into `dist/package.json`: the pins are already resolved in the root lockfile and carried into the pruned lockfile (see design.md D3).

The **runtime stage** SHALL copy only `apps/api/dist` from the builder (as `/app`), set `ENV NODE_ENV=production`, run as non-root (`USER node`, with `--chown=node:node` on the copy), declare `EXPOSE 8080` as documentation, and set `CMD ["node", "main.js"]`. The runtime stage SHALL remove the package managers bundled with the base image — npm, npx, corepack and yarn (their packages under `/usr/local/lib/node_modules/` and `/opt/yarn-v*`, and their `/usr/local/bin` entries) — because the runtime only runs `node main.js` and they only add vulnerable, unused code; the builder stage keeps using npm. The image SHALL NOT contain a `HEALTHCHECK` instruction (Cloud Run uses service-level startup-probe configuration, not the Docker directive). The final image SHALL be fully self-contained: `node main.js` resolves every dependency — including `@eco-metrics/shared` — from `/app/node_modules`, with no workspace tree, no root `node_modules`, and no `.env` file in the image.

#### Scenario: Image builds from a clean checkout

- **GIVEN** a clean checkout of the repository (no `node_modules`, no `dist`) and the root build context filtered by `.dockerignore`
- **WHEN** `docker build .` runs
- **THEN** the build completes successfully, producing `apps/api/dist` inside the builder via the NX prune chain
- **AND** the runtime stage contains `/app/main.js`, `/app/data/water-footprint.json`, `/app/node_modules`, and `/app/workspace_modules`

#### Scenario: Self-contained runtime boots without the workspace

- **GIVEN** the built runtime image (or an equivalent extraction of `apps/api/dist` with its `node_modules`) placed in isolation, with no parent `node_modules` and no workspace files
- **WHEN** `PORT=8080 NODE_ENV=production CORS_ORIGIN=<url> SWAGGER_ENABLED=false INTERNAL_API_KEY=<32+ chars> node main.js` runs
- **THEN** the NestJS app starts and listens on the injected `PORT`
- **AND** `GET /api/v1/health` returns `200` with `{ "status": "ok" }`
- **AND** `GET /api/v1/water-footprint/products` with the `X-Internal-Api-Key` header returns `200` with `success: true` and 60 products

#### Scenario: Security pins are preserved in the image

- **WHEN** the runtime dependencies are installed inside `apps/api/dist` from the pruned lockfile
- **THEN** each exact-version pin in the root `package.json` `overrides` block that applies to a production dependency (e.g. `multer`) resolves to the pinned version, not the vulnerable natural transitive version
- **AND** this holds without the `overrides` block being present in `apps/api/dist/package.json`

#### Scenario: Image runs as non-root

- **WHEN** the runtime container starts
- **THEN** the Node process runs as the `node` user (not root)

#### Scenario: No local environment files ship in the image

- **WHEN** the image is built
- **THEN** no `.env` file (and no `gha-creds-*.json` credentials file) is present in any layer

#### Scenario: Production install is reproducible from the pruned lockfile

- **GIVEN** the same commit built twice at different times, with no change to `package-lock.json`
- **WHEN** `npm ci --omit=dev --ignore-scripts` runs in `apps/api/dist` for each build
- **THEN** both installs resolve identical versions for every package (no transitive dependency is re-resolved against the registry)
- **AND** `npm ls --omit=dev` inside the image reports no missing, invalid, or extraneous packages

#### Scenario: An inconsistent pruned lockfile fails the image build

- **GIVEN** a `package-lock.json` for which the pruned lockfile does not satisfy the pruned `package.json`
- **WHEN** the builder runs `npm ci --omit=dev --ignore-scripts` in `apps/api/dist`
- **THEN** the command fails and the image is not built (the lockfile is never silently discarded or regenerated)

#### Scenario: Both stages pin the same base image digest

- **GIVEN** the `Dockerfile` at the repository root
- **WHEN** its `FROM` lines are read
- **THEN** there are exactly two, each of the form `FROM node:24-alpine@sha256:<64 hex chars>` (the runtime one without `AS`, the builder one with `AS builder`)
- **AND** both carry the identical digest

#### Scenario: The pinned digest is the multi-arch index

- **GIVEN** the digest in the `Dockerfile`
- **WHEN** the registry manifest for `node:24-alpine@sha256:<digest>` is requested
- **THEN** its media type is an OCI image index or Docker manifest list (not a single-platform image manifest)
- **AND** it equals the `Docker-Content-Digest` returned for the `node:24-alpine` tag at the time of pinning

#### Scenario: Runtime image ships no package manager

- **GIVEN** the built runtime image
- **WHEN** its filesystem is inspected
- **THEN** none of `npm`, `npx`, `corepack`, `yarn` or `yarnpkg` resolves on the `PATH`
- **AND** `/usr/local/lib/node_modules/npm`, `/usr/local/lib/node_modules/corepack` and `/opt/yarn-v*` do not exist
- **AND** `node main.js` still starts the API and `GET /api/v1/health` returns `200`
