# api-cloud-run-deploy — Delta

## MODIFIED Requirements

### Requirement: Multi-stage Docker image builds a self-contained apps/api runtime

A `Dockerfile` SHALL exist at the repository root (build context = repo root). It SHALL be multi-stage with both stages based on `node:24-alpine` (matching `.nvmrc`).

The **builder stage** SHALL, in order: copy the root manifests (`package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `nx.json`, `tsconfig.base.json`, `tsconfig.json`) and the workspace manifests (`apps/api/package.json`, `packages/shared/package.json`) first (layer-cache friendly); run `HUSKY=0 npm ci` (full install — NX and webpack are dev dependencies; `HUSKY=0` because `.git` is not in the context, mirroring the `release.yml` convention; `legacy-peer-deps` comes from the copied `.npmrc`); copy the `apps/api` and `packages/shared` sources; run `npx nx run api:prune` (which triggers `build` → `prune-lockfile` → `copy-workspace-modules` and emits `apps/api/dist` with `main.js`, `data/water-footprint.json`, a pruned `package.json` carrying `"@eco-metrics/shared": "file:./workspace_modules/@eco-metrics/shared"`, and `workspace_modules/@eco-metrics/shared` including its built `dist/`); then produce the runtime dependencies **inside** `apps/api/dist` by copying the root `overrides` block (security pins, e.g. `multer@2.3.0`) into the pruned `package.json` and running `npm install --omit=dev --legacy-peer-deps --ignore-scripts` there. The pruned `package-lock.json` emitted by `prune-lockfile` SHALL NOT be used for the dist install (it is inconsistent for this repo's cross-workspace hoisting and overrides — see design.md D2).

The **runtime stage** SHALL copy only `apps/api/dist` from the builder (as `/app`), set `ENV NODE_ENV=production`, run as non-root (`USER node`, with `--chown=node:node` on the copy), declare `EXPOSE 8080` as documentation, and set `CMD ["node", "main.js"]`. The image SHALL NOT contain a `HEALTHCHECK` instruction (Cloud Run uses service-level startup-probe configuration, not the Docker directive). The final image SHALL be fully self-contained: `node main.js` resolves every dependency — including `@eco-metrics/shared` — from `/app/node_modules`, with no workspace tree, no root `node_modules`, and no `.env` file in the image.

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

- **WHEN** the runtime dependencies are installed inside `apps/api/dist`
- **THEN** the root `package.json` `overrides` block is applied (e.g. `multer` resolves to the pinned `2.3.0`, not the vulnerable natural transitive version)

#### Scenario: Image runs as non-root

- **WHEN** the runtime container starts
- **THEN** the Node process runs as the `node` user (not root)

#### Scenario: No local environment files ship in the image

- **WHEN** the image is built
- **THEN** no `.env` file (and no `gha-creds-*.json` credentials file) is present in any layer

### Requirement: Post-deploy verification proves the deployed BFF end-to-end

The runbook SHALL define the user-executed verification (curl + browser — not automated specs): `GET /api/v1/health` on the deployed `*.run.app` URL returns `200` `{ "status": "ok" }`; `GET /api/v1/water-footprint/products` returns `success: true` with 60 products; after setting `API_BASE_URL=https://<run-url>/api/v1` in Vercel (Production AND Preview) and a redeploy (or ISR self-heal within 24 h), the deployed `/water-footprint/` page renders the product table from the deployed BFF.

#### Scenario: Health on the deployed URL

- **WHEN** `curl https://eco-metrics-api-<hash>.<region>.run.app/api/v1/health` runs after deploy
- **THEN** the response is `200` with `{ "status": "ok" }` (never `429` — the health route is throttler-exempt)

#### Scenario: Full dataset on the deployed URL

- **WHEN** `curl https://<run-url>/api/v1/water-footprint/products` runs
- **THEN** the response is `200` with `success: true` and `data` containing 60 products

#### Scenario: The deployed web page renders from the deployed BFF

- **GIVEN** `API_BASE_URL` set in Vercel to the deployed API and the web app redeployed (or ISR revalidation elapsed)
- **WHEN** a visitor loads `/water-footprint/`
- **THEN** the product table renders with real data (server-rendered HTML contains product names)
