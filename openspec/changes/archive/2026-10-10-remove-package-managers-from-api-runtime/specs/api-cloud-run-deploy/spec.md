## MODIFIED Requirements

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
- **WHEN** `PORT=8080 NODE_ENV=production CORS_ORIGIN=<url> SWAGGER_ENABLED=false node main.js` runs
- **THEN** the NestJS app starts and listens on the injected `PORT`
- **AND** `GET /api/v1/health` returns `200` with `{ "status": "ok" }`
- **AND** `GET /api/v1/water-footprint/products` returns `200` with `success: true` and 60 products

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
