# Tasks: Deploy apps/api on Google Cloud Run

> All code, tests, and test descriptions in English. Jest tests use `it()`. Tests must produce zero errors and zero warnings. No commit/push tasks — the workflow stops at the mandatory user-approval checkpoint (AGENTS.md SDD step 5).
>
> **Task groups 1–8 are repo-side (agent-executable). Group 9 is the user-executed runbook (dashboard/gcloud — the agent does NOT execute it). Group 10 is post-deploy follow-up (user-side, small agent assist possible).** The first real deploy happens only when the user runs Group 9.

---

## Task Group 1 — API code: throttler exemption on the health endpoint

### [x] 1.1 Add `@SkipThrottle()` to `HealthController.check()`

- In `apps/api/src/health/health.controller.ts`: import `SkipThrottle` from `@nestjs/throttler` and decorate the `check()` method with `@SkipThrottle()` (method-level, not class-level — the exemption is for the health route only).
- Touch nothing else in the controller (Swagger decorators, response shape unchanged).

**Verification:** `npx nx build api` compiles; code review against the `api-security-hardening` delta spec.

### [x] 1.2 Behavioral test: health route bypasses rate limiting

- Extend `apps/api/__tests__/health/health.controller.test.ts` with a new `describe`/`it` using the harness pattern of `apps/api/__tests__/app/throttler-guard.test.ts`: a `TestingModule` with `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 3 }])`, `APP_GUARD` → `ThrottlerGuard`, and the **real** `HealthController`; `app.init()`; send 5 supertest requests to `GET /health`; assert every response is `200` with `{ status: 'ok' }` (none is `429`); `app.close()` in `afterAll` (no open handles).
- Keep the existing `should return { status: "ok" }` unit test unchanged.

**Verification:** `npx nx test api` — health suite green, zero warnings, no open-handle warnings.

---

## Task Group 2 — Workspace dependency declaration (enables the prune pattern)

### [x] 2.1 Declare `@eco-metrics/shared` in `apps/api/package.json`

- Add `"@eco-metrics/shared": "*"` to `dependencies` (alphabetical position), keeping the rest of the manifest untouched. `*` is deterministic for a workspace-internal package (npm links the local workspace; there is no registry version to pin).
- Run `npm install` at the repo root to regenerate `package-lock.json` (this records the workspace link).

**Verification:** `git diff package-lock.json` shows the new workspace link entries; `npm ci` still succeeds from clean (`rm -rf node_modules && npm ci` if in doubt); `npx nx run api:prune` now populates `apps/api/dist/workspace_modules/@eco-metrics/shared/` (with `dist/index.js` inside) and the pruned `dist/package.json` carries `"@eco-metrics/shared": "file:./workspace_modules/@eco-metrics/shared"`.

### [x] 2.2 NX sync contingency (only if triggered)

- If any `nx` command reports "The workspace is out of sync" after 2.1: run `npx nx sync` and commit whatever it changes (in scratch testing it changed nothing; the check passed from clean state).

**Verification:** `npx nx build api` and `npx nx test api` run without sync errors.

---

## Task Group 3 — Docker image

### [x] 3.1 Create `.dockerignore` (repo root)

Exclude exactly (validated set — nothing `nx build api` needs may appear here):

```
# VCS / CI / tooling state
.git
.github
.nx
.husky
.vercel

# Dependencies — installed inside the builder stage
node_modules
**/node_modules

# Build outputs — fresh builds happen inside the image
dist
**/dist
.next
out-tsc
test-output
coverage
*.tsbuildinfo

# The web app deploys on Vercel — not part of the API image
apps/web

# Tests and E2E — not needed to build the API
**/__tests__
**/*.spec.ts
**/*.test.ts
**/*.test.tsx
e2e

# Docs / specs / collections — not needed to build
openspec
docs
postman
dev

# Local env & generated credentials — never ship in a layer
.env
**/.env
gha-creds-*.json
```

**Verification:** `git status` untracked check; context size sanity (the tracked tree minus exclusions is a few MB); cross-check every path against the builder COPY list in 3.2.

### [x] 3.2 Create `Dockerfile` (repo root)

Multi-stage, both stages `node:24-alpine`:

- **Builder:** `WORKDIR /repo`; `ENV NX_DAEMON=false`; copy root manifests first (`package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `nx.json`, `tsconfig.base.json`, `tsconfig.json`) + `apps/api/package.json` + `packages/shared/package.json`; `RUN HUSKY=0 npm ci`; copy `apps/api` and `packages/shared` sources; `RUN npx nx run api:prune`; then the self-contained dist install:
  `cd apps/api/dist`, copy the root `overrides` into the pruned `package.json` (one-line `node -e` reading `../../../package.json` — single source of truth for the security pins), `rm -f package-lock.json` (the prune-lockfile output is inconsistent for this repo — design.md D2), and `npm install --omit=dev --legacy-peer-deps --ignore-scripts --no-audit --no-fund`.
- **Runtime:** `ENV NODE_ENV=production`; `WORKDIR /app`; `COPY --from=builder --chown=node:node /repo/apps/api/dist ./`; `USER node`; `EXPOSE 8080` (documentation — Cloud Run injects `PORT`); `CMD ["node", "main.js"]`. **No `HEALTHCHECK` instruction.**

**Verification:** review against the `api-cloud-run-deploy` spec (image requirements + scenarios); if Docker is available locally, optional smoke: `docker build -t eco-metrics-api:local .` then `docker run --rm -e PORT=8080 -e CORS_ORIGIN=http://localhost:3000 -e SWAGGER_ENABLED=false -p 8080:8080 eco-metrics-api:local` and curl health + products (this exact sequence was validated end-to-end in a scratch workspace during spec research — the isolated-dist boot passed with health 200 and 52 products). If Docker is unavailable, skip — the first workflow run (Group 9) is the definitive test.

---

## Task Group 4 — Deploy workflow

### [x] 4.1 Create `.github/workflows/deploy-api.yml`

- `name: Deploy API`; `on: push: branches: [develop]` with `paths: [apps/api/**, packages/shared/**, Dockerfile, .dockerignore, .github/workflows/deploy-api.yml, package.json, package-lock.json, .npmrc, .nvmrc, nx.json, tsconfig.base.json, tsconfig.json]` + `workflow_dispatch:`; `concurrency: { group: deploy-api, cancel-in-progress: false }`; `permissions: { contents: read, id-token: write }`.
- Steps: `actions/checkout@v5` → pre-flight asserting the five variables (`GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, `CORS_ORIGIN`) with a named-variable failure message → `google-github-actions/auth@v3` (`id: auth`, `token_format: access_token`, `workload_identity_provider: ${{ vars.WIF_PROVIDER }}`, `service_account: ${{ vars.WIF_SERVICE_ACCOUNT }}`, `project_id: ${{ vars.GCP_PROJECT_ID }}`) → `docker/login-action@v3` (registry `${{ vars.GCP_REGION }}-docker.pkg.dev`, `username: oauth2accesstoken`, `password: ${{ steps.auth.outputs.access_token }}`) → `docker build` + `docker push` of `${{ vars.GCP_REGION }}-docker.pkg.dev/${{ vars.GCP_PROJECT_ID }}/eco-metrics/api:${{ github.sha }}` (SHA-only tags, no `:latest`) → `google-github-actions/deploy-cloudrun@v3` (`id: deploy`, `service: eco-metrics-api`, `image:` the pushed SHA tag, `region: ${{ vars.GCP_REGION }}`, `project_id: ${{ vars.GCP_PROJECT_ID }}`, `env_vars:` `NODE_ENV=production` / `CORS_ORIGIN=${{ vars.CORS_ORIGIN }}` / `SWAGGER_ENABLED=false` — **never `PORT`**, `flags: --allow-unauthenticated --min-instances=0 --cpu=1 --memory=512Mi --startup-probe=httpGet.path=/api/v1/health,httpGet.port=8080,periodSeconds=2,timeoutSeconds=2,failureThreshold=15`) → a final step echoing `${{ steps.deploy.outputs.url }}`.
- **Action versions are v3 (current per docs — the brief's v2 is outdated).**

**Verification:** YAML lint (`npx prettier --check .github/workflows/deploy-api.yml`); review against the workflow/auth/tags/service requirements in the `api-cloud-run-deploy` spec; confirm no `PORT` anywhere in `env_vars`.

---

## Task Group 5 — Railway → Cloud Run reference sweep

### [x] 5.1 Code and test fixtures

- `apps/api/src/main.ts:38` — remove `.addServer('https://eco-metrics-earth-api.railway.app', 'production (Railway)')` (keep the local server entry; the production entry returns post-deploy — task 10.1).
- `apps/web/__tests__/lib/apiBaseUrl.test.ts:15-16` — fixture URL → a `*.run.app` example (e.g. `https://eco-metrics-api-abcdefghij.us-central1.run.app/api/v1`).

**Verification:** `npx nx test web` and `npx nx test api` green (fixture is cosmetic; assertions unchanged in substance).

### [x] 5.2 Scripts and docs

- `scripts/vercel-ignore.sh` — comment "deployed on Railway" → Cloud Run; extend the denylist with `-e '^Dockerfile$' -e '^\.dockerignore$' -e '^\.github/workflows/deploy-api\.yml$'` (deploy-plumbing-only pushes skip the Vercel build; do NOT add `ci.yml`/`release.yml`).
- `AGENTS.md:17` — "Deploy targets: Vercel (web), Cloud Run (api)".
- Root `README.md:8` + `apps/api/README.md:8` — "Deploy target: Cloud Run" (both files, kept manually identical).
- `apps/web/.env.example:8` — production comment → "the deployed API URL (e.g. the Cloud Run service — see docs/deploy/cloud-run.md)".
- `openspec/specs/water-footprint-page/spec.md:46-47` — the `API_BASE_URL` scenario example URL → a `*.run.app` example (direct main-spec sweep fix; the behavior is unchanged).

**Verification:** `grep -rin railway --exclude-dir={node_modules,.nx,.git,.next,dist,out-tsc,test-output} . | grep -v openspec/changes/archive` returns **zero** matches; `bash -n scripts/vercel-ignore.sh` passes; the denylist still skips for an api-only diff and builds for a web diff (reason through the grep logic).

---

## Task Group 6 — ROADMAP.md updates (Spanish, per its convention)

### [x] 6.1 Rewrite the P3 block as "P3: Deploy de Cloud Run (apps/api)"

- Title, body, and metadata per the proposal: Cloud Run replaces Railway (trial made US$5/mes Hobby unattractive); always-free tier (2M req/mes, 180k vCPU-s, 360k GiB-s — volume is hundreds of requests; requiere billing/tarjeta activa); scale-to-zero with ~1–3 s cold start absorbed by ISR background revalidation; Docker build monorepo (deps externalizadas + `@eco-metrics/shared` desde el workspace, patrón `prune` de NX); WIF/OIDC sin keys JSON; Artifact Registry; región y URL `*.run.app`; costo US$0 a este volumen. Drop the old "Dependencias: P1" line (the BFF already serves `water-footprint`; P1 builds on top of the deployed API). Requisito: cuenta GCP con billing + runbook `docs/deploy/cloud-run.md`. **Dificultad:** 4/10 · **Estado:** En implementación (spec `deploy-api-cloud-run`).

### [x] 6.2 Update the status table and the other Railway mentions

- Status table "CD / Deploy" row: web on Vercel + api → Cloud Run from develop via GitHub Actions (spec in implementation; pending runbook execution); keep the I02 staging note.
- P2: line ~154 `SENTRY_DSN` "de Vercel y Railway" → "de Vercel y Cloud Run"; stack table line ~170 "CI/CD (Vercel + Railway)" → "(Vercel + Cloud Run)"; stack table row "Healthcheck sin throttler" → mark as done by this change (✅ aplicado en `deploy-api-cloud-run`).
- I02 (~250): reword — Cloud Run has no PR-preview equivalent; Vercel previews consume the production BFF (staging-is-production trade-off accepted for now).
- I03 (~115 and ~254): "BFF en Railway" → "BFF en Cloud Run".
- I11 (~179 and ~301): "retención de logs de Railway (7 días)" → "retención de Cloud Logging (30 días en free tier)".

**Verification:** read-through — no Railway mentions outside `openspec/changes/archive/`; P-series numbering intact (P3 is the last P-item, so no renumbering needed yet); "Última actualización" date bumped.

---

## Task Group 7 — Documentation

### [x] 7.1 Create `docs/deploy/cloud-run.md` (the user-executed runbook)

Cover, in order (full outline in the `api-cloud-run-deploy` spec's runbook requirement): GCP project selection/creation + billing prerequisite; enable APIs (`run`, `artifactregistry`, `iam`, `iamcredentials`, `sts`); `gcloud` login; create the `eco-metrics` Artifact Registry Docker repo; create the `github-deployer` SA (`roles/run.admin` + `roles/artifactregistry.writer` project-level; `roles/iam.serviceAccountUser` on the Compute Engine default SA); create the WIF pool + OIDC provider (issuer `https://token.actions.githubusercontent.com`, attribute mapping, attribute condition restricting to `maf248/eco-metrics-earth`); grant `roles/iam.workloadIdentityUser` to the repo's principal set; extract the provider full name; set the five GitHub **variables**; the ~5 min IAM propagation note; first deploy (push to develop or `workflow_dispatch`); record the `https://eco-metrics-api-<hash>.<region>.run.app` URL; verification curls (health 200, 52 products); Vercel `API_BASE_URL` for **Production AND Preview** + redeploy (or ISR self-heal ≤24 h); load `/water-footprint/` and confirm the table renders; optional path-filter verification pushes; free-tier limits + billing alert + Artifact Registry storage note; troubleshooting (WIF auth errors, push denied, startup probe timeout via `gcloud run services logs read`, cold-start first request). Every gcloud command written out with `<PLACEHOLDER>` values.

**Verification:** a developer with no GCP context can follow it top-to-bottom; every command is copy-pasteable after filling placeholders; cross-checked against the runbook requirement scenarios.

### [x] 7.2 READMEs and `.env.example`

- Root `README.md` + `apps/api/README.md` (identical copies): deploy target line → Cloud Run; add a "Deploy (Cloud Run)" section — one-paragraph Docker build summary (multi-stage, self-contained dist via NX prune, non-root) + pointer to `docs/deploy/cloud-run.md` + the GitHub variables list.
- `apps/api/.env.example`: production notes — `PORT` is injected by Cloud Run in production (never set it manually there), `CORS_ORIGIN` = the Vercel production URL, `SWAGGER_ENABLED=false` in production + pointer to the runbook.

**Verification:** both READMEs byte-identical on the shared content; `npx prettier --check` passes on all touched docs.

---

## Task Group 8 — Verification gates (repo-side)

### [x] 8.1 Lint

```bash
npm run lint
```

Zero errors, zero warnings.

### [x] 8.2 Build (all three projects)

```bash
npm run build
```

All projects compile; `apps/api/dist/data/water-footprint.json` exists after the api build.

### [x] 8.3 Unit tests (all three projects)

```bash
npm run test
```

All suites green (328 existing + the new health-bypass case); coverage thresholds intact; zero console errors/warnings; no `.snap` changes.

### [x] 8.4 E2E

```bash
npm run e2e
```

Full suite green via the deterministic webServer wrapper — no new E2E specs by design (see proposal Non-Goals); the `@SkipThrottle` change only makes the readiness polling more robust.

### [x] 8.5 Reference sweep + Dockerfile cross-check

- `grep -rin railway` (excluding archive/generated paths) → zero matches.
- Re-read the Dockerfile COPY list against `.dockerignore` — nothing the build needs is excluded.

---

## Task Group 9 — User runbook: configure Cloud Run (dashboard/gcloud — NOT agent-executable)

> The agent stops here. These steps are executed by the user in the GCP console/CLI, GitHub, and Vercel, following `docs/deploy/cloud-run.md`. No automated task.

### [ ] 9.1 GCP setup (user)

Select/create the project; confirm billing is active; enable the five APIs; `gcloud` login; create the `eco-metrics` Artifact Registry repo; create the `github-deployer` SA with the three role grants; create the WIF pool + provider (repo-restricted attribute condition); grant `workloadIdentityUser` to the repo principal set; extract the provider full name.

### [ ] 9.2 GitHub variables (user)

Set the five repository **variables**: `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, `CORS_ORIGIN` (the Vercel production URL). Wait ~5 minutes for IAM propagation.

### [ ] 9.3 First deploy (user)

After this change is committed and pushed to `develop` (with user approval at the checkpoint): trigger the workflow (push or `workflow_dispatch`); watch it build + push + deploy; record the `*.run.app` URL from the deploy step output.

### [ ] 9.4 Verify the deployed API (user)

`curl https://<run-url>/api/v1/health` → `200` `{ "status": "ok" }`; `curl https://<run-url>/api/v1/water-footprint/products` → `success: true`, 52 products.

### [ ] 9.5 Wire up Vercel (user)

Set `API_BASE_URL=https://<run-url>/api/v1` for **Production AND Preview**; redeploy web (or let ISR self-heal within 24 h); load `/water-footprint/` and confirm the table renders.

### [ ] 9.6 Optional verifications (user)

Web-only push → no Cloud Run deploy runs; api-only push → Vercel build skipped. Set a GCP billing alert. Optionally add an Artifact Registry cleanup policy.

---

## Task Group 10 — Post-deploy follow-ups (after the first successful runbook deploy)

### [ ] 10.1 Re-add the production Swagger server entry (agent, tiny)

With the real URL recorded from 9.3: `.addServer('https://eco-metrics-api-<hash>.<region>.run.app', 'production (Cloud Run)')` in `apps/api/src/main.ts` (design.md D7). Trivial change — direct implementation, no new spec.

### [x] 10.2 Update ROADMAP status (agent, at archive time) (completed at archive time — 15 Sep 2026)

Via `/opsx:archive`: delete the P3 block (P-series stays continuous — P3 is the last P-item), update the status-table "CD / Deploy" row to ✅ (web Vercel + api Cloud Run, both auto-deploying from their platforms), bump "Última actualización".

### [ ] 10.3 STOP — mandatory user-approval checkpoint

Present the full summary: green gates (lint + build + unit + E2E), reviewer verdict, and a `git status`/diff overview. **No commit and no push until the user explicitly approves** (AGENTS.md SDD step 5 — non-negotiable). The runbook (Group 9) executes only after this change is pushed with approval.
