# Design: Deploy apps/api on Google Cloud Run

## Technical Approach

### Architecture

```
                     push to develop (paths filter: api-affecting files)
                                   │
                                   ▼
              ┌──────────────────────────────────────────┐
              │ GitHub Actions: deploy-api.yml           │
              │  1. checkout                              │
              │  2. pre-flight: 5 repo variables set     │
              │  3. auth@v3 (WIF/OIDC → access token)    │  ← no SA keys
              │  4. docker/login-action (oauth2accesstok)│
              │  5. docker build (root Dockerfile)       │
              │  6. docker push  <region>-docker.pkg.dev │
              │     └─ /<project>/eco-metrics/api:<sha>  │
              │  7. deploy-cloudrun@v3                   │
              │     service eco-metrics-api              │
              │     startup probe /api/v1/health         │
              │     env: NODE_ENV, CORS_ORIGIN,          │
              │           SWAGGER_ENABLED (never PORT)   │
              │     --min-instances=0 (scale-to-zero)    │
              │     --allow-unauthenticated              │
              └───────────────┬──────────────────────────┘
                              │ image pull + probe
                              ▼
              ┌──────────────────────────────────────────┐
              │ Cloud Run service eco-metrics-api        │
              │ node:24-alpine, USER node, ~250 MB image │
              │ /app = apps/api/dist (self-contained:    │
              │   main.js + data/ + node_modules +       │
              │   workspace_modules/@eco-metrics/shared) │
              │ URL: https://eco-metrics-api-<hash>.     │
              │      <region>.run.app                   │
              └───────────────▲──────────────────────────┘
                              │ server-side fetch (ISR, revalidate 86400,
                              │   AbortSignal.timeout(5000))
              ┌───────────────┴──────────────────────────┐
              │ apps/web on Vercel                       │
              │ API_BASE_URL=https://<run-url>/api/v1    │
              │ (set by the user in the Vercel dashboard)│
              └──────────────────────────────────────────┘
```

The web side is untouched: the existing `water-footprint.ts` fetch helper, ISR, and graceful degradation already handle a remote `API_BASE_URL`. Only its value changes (runbook step).

### D1 — Dockerfile at the repository root

**Decision: root.** The build needs the root manifests, `nx.json`, `tsconfig.base.json`, and two workspace packages — the build context is the repo root no matter where the `Dockerfile` sits. An `apps/api/Dockerfile` would still be built with `docker build -f apps/api/Dockerfile .` (context = root) and buys nothing; the root placement keeps "context = Dockerfile location" and matches how the `.dockerignore` must live at the context root anyway (Docker only honors it there).

### D2 — Runtime dependency strategy: NX prune pattern with a self-contained `dist`

This is the most consequential decision, and it was **validated empirically in a scratch workspace during spec research** (not assumed). Three candidate approaches were tested:

**Rejected: root `node_modules` with `npm ci --omit=dev` (all workspace manifests present).** Produces a ~430 MB tree that **cannot run the app**: the root lockfile places `rxjs@7.8.2` at `apps/api/node_modules/rxjs` while `@nestjs/common` is hoisted at root and resolves `rxjs` from the root — and the root `rxjs@7.8.1` belongs to the *dev* tree, so `--omit=dev` removes it and boot fails with `ERR_MODULE_NOT_FOUND: Cannot find package 'rxjs'`. The repo's local runtime silently depends on a dev-tree hoisting artifact.

**Rejected: ship the full root `node_modules` (dev included, ~750 MB–1 GB image).** It does run (it reproduces the local layout exactly — including the nested `apps/api/node_modules/rxjs` the orchestrator's original "ship root node_modules" summary had missed), but it ships the entire dev toolchain (NX, ESLint, Playwright, …) in a production image: slow pushes, slow cold-start pulls, bloated Artifact Registry storage. Unacceptable for a portfolio showcase.

**Chosen: the repo's own NX `prune` targets, producing a self-contained `apps/api/dist`.** `apps/api/package.json` already defines `prune-lockfile` + `copy-workspace-modules` + `prune` (unused until now — clearly the repo's intended deployment story). The validated sequence inside the Docker builder:

1. `npx nx run api:prune` → builds `shared` then `api` (via `targetDefaults.build.dependsOn: ["^build"]`), then emits `apps/api/dist` with `main.js`, `data/`, a pruned `package.json`, and `workspace_modules/@eco-metrics/shared` (including its built `dist/`).
2. **Discard `prune-lockfile`'s lockfile** — it is inconsistent for this repo (it records the root-hoisted `rxjs@7.8.1` against a manifest that declares `7.8.2`, and drops transitive deps behind the root `overrides`, e.g. `multer`). `npm ci` against it fails with `ERESOLVE`/sync errors. Instead: copy the root `overrides` block into the pruned `package.json` (single source of truth for the security pins — without it, `multer` resolves to the vulnerable `2.2.0`), then `npm install --omit=dev --legacy-peer-deps --ignore-scripts` inside `dist`. `--legacy-peer-deps` is passed explicitly because npm does not read the root `.npmrc` from a subdirectory (verified: `npm config get legacy-peer-deps` → `false` from `dist/`); `--ignore-scripts` because the dist tree needs no lifecycle scripts (and the root `prepare: husky` binary does not exist with `--omit=dev`).
3. Result: `dist` carries its own ~85 MB `node_modules` (131 packages, `rxjs@7.8.2`, `multer@2.3.0`, `@eco-metrics/shared@1.2.0` from `workspace_modules`). **Validated by booting `node main.js` from an isolated copy of `dist` with no parent `node_modules`: health 200, 52 products, 404 fallback.** The runtime stage copies only `dist` → image ≈ 250 MB uncompressed (~100–120 MB compressed).

**Required enabler (flagged for user approval):** `copy-workspace-modules` emits an **empty** `workspace_modules/` today because neither app declares `@eco-metrics/shared` — it resolves via the tsconfig path alias and npm's implicit workspace linking. The change adds `"@eco-metrics/shared": "*"` to `apps/api/package.json` `dependencies` (`*` is deterministic for a workspace-internal package — there is no registry version to pin; the AGENTS.md exact-pin rule targets registry reproducibility) and regenerates the root lockfile. This is a **manifest change beyond the "@SkipThrottle is the only code change" premise** — it is one line of dependency hygiene (making an existing runtime dependency explicit), it does not alter any behavior locally (same symlink, same path alias), and it is what unlocks the repo's own prune infrastructure. If the user rejects it, the fallback is the "full root `node_modules`" image above (works, ~1 GB, zero manifest changes) — the Dockerfile would swap step 2 for a full-tree copy including the nested `apps/api/node_modules`.

**Contingency:** if NX reports "workspace is out of sync" after the dependency is added (observed once with stale state; not reproducible from clean state), run `npx nx sync` and commit any changes it makes.

### D3 — `.dockerignore`: the empirically validated exclusion set

The spec's exclusion list is exactly the set that was rsync'd into the scratch workspace where the full build+prune+boot chain succeeded — nothing `nx build api` needs is excluded. Two deliberate calls:

- **`apps/web` excluded entirely.** npm `ci`/`install` with a workspace absent from disk **succeeds and silently skips that workspace's deps** (verified on npm 11.12.1, the Node 24 bundled version) — which also makes the builder install leaner (no `next`/`react`). Fallback if a future npm changes this: add `!apps/web/package.json` to `.dockerignore` and one `COPY apps/web/package.json apps/web/` line (cost: the builder then installs web's prod deps too).
- **`**/.env` and `gha-creds-*.json` excluded** — local env files must never ship in a layer, and the auth action's README recommends ignoring its generated credential files.

### D4 — Workflow design

- **Trigger:** push to `develop` + `paths:` filter (the inverse of `scripts/vercel-ignore.sh`'s denylist — see D9), plus `workflow_dispatch` for the first deploy. `concurrency: deploy-api` with `cancel-in-progress: false` queues overlapping deploys instead of racing them.
- **Action versions (verified against current docs, not memory):** `google-github-actions/auth@v3` and `google-github-actions/deploy-cloudrun@v3` — **v3 is current; the task brief said v2, which is outdated.** `actions/checkout@v5` matches `ci.yml`. `docker/login-action@v3`.
- **Auth:** WIF through a service account with `token_format: access_token` (the token feeds the Docker registry login as `oauth2accesstoken`). Requires `permissions: id-token: write`. The deployer SA needs `roles/run.admin` + `roles/artifactregistry.writer` (project) and `roles/iam.serviceAccountUser` on the Compute Engine default SA (Cloud Run's actAs requirement — per the deploy-cloudrun README's authorization section).
- **Tags: SHA-only, no `:latest`.** Immutable deploys, exact traceability commit↔revision, no mutable-tag drift. Rollback = Cloud Run revision traffic or redeploying an old SHA.
- **Service flags:** `--allow-unauthenticated` (the BFF is an intentionally public API — Vercel's server-side fetch sends no credentials; new Cloud Run services are private by default, so the first deploy must set this explicitly; the flag is declarative in the workflow so the security posture is visible in code), `--min-instances=0` (explicit scale-to-zero), `--cpu=1 --memory=512Mi` (explicit free-tier-safe defaults), startup probe on `/api/v1/health` (`periodSeconds=2,timeoutSeconds=2,failureThreshold=15` → ~30 s boot budget; NestJS boots in ~1–2 s).
- **No CI gating:** the deploy runs in parallel with `ci.yml` (which gates every push to every branch). A broken image cannot take down production: the deploy health check (on by default) fails the workflow when the startup probe fails, and Cloud Run keeps traffic on the last healthy revision. Waiting for CI would add a `workflow_run` indirection and minutes of latency for no additional safety at this scale.
- **`env_vars` merge strategy (default `merge`):** the three managed vars are re-asserted every deploy; any future manually-added vars on the service are preserved.

### D5 — GitHub variables, not secrets

`GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, `CORS_ORIGIN` are all **repository variables** (Settings → Secrets and variables → Actions → Variables). None is a credential (project ID, region, provider resource name, SA email, a public URL) — variables avoid needless log masking and are visible to anyone who can read the repo, which is fine and aids debugging. A pre-flight step fails fast with a named-variable message if any is unset.

### D6 — `CORS_ORIGIN` sourcing

The workflow passes `CORS_ORIGIN=${{ vars.CORS_ORIGIN }}` (the Vercel production URL) to the Cloud Run service. Rationale: the value is a public URL that only the user knows at runbook time; a repo variable keeps it out of the workflow YAML (where it would rot if the Vercel URL changes) and out of secrets (it is not sensitive). Note that in production the browser never calls the BFF directly (the fetch is server-side inside the Server Component), so CORS is only exercised by direct browser calls (e.g. Swagger UI try-it-out when enabled, local dev) — the single-origin limitation (I03) remains a non-issue for the deployed product.

### D7 — Swagger production server URL (the `*.run.app` chicken-and-egg)

The real `https://eco-metrics-api-<hash>.<region>.run.app` URL is only knowable after the first deploy. Options considered: (a) env-driven `SWAGGER_SERVER_URL` config — rejected: adds a config getter + Joi entry + docs for a feature that is **disabled in production** (`SWAGGER_ENABLED=false`); (b) shipping a placeholder URL — rejected: a knowingly-fake URL in the repo is worse than none. **Chosen: remove the Railway `.addServer(...)` line in this change** (the sweep requires it), leaving the local server entry; the runbook's final step records the real URL and a **post-deploy follow-up task re-adds the production entry** with it. The line is cosmetic-in-prod (the Swagger doc is never generated there), so nothing user-facing regresses in the interim.

### D8 — `@SkipThrottle()` on the health check

Pull-forward of the "Healthcheck sin throttler" row already in P2's stack table. The Cloud Run startup probe polls `/api/v1/health` during instance boot; the global `ThrottlerGuard` (60 req/60 s/IP) could in principle answer a probe with `429`, which Cloud Run interprets as unhealthy. The same risk applies to the E2E readiness gate (`run-dev-servers.ts` polls health). The decorator exempts only the health route; every other route keeps the global limit (delta spec on `api-security-hardening`). **Test:** behavioral, not introspective — a mini-app with `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 3 }])` + `APP_GUARD` `ThrottlerGuard` + the real `HealthController`, asserting >3 requests to `/health` all return 200 (mirrors the existing `throttler-guard.test.ts` harness pattern). No E2E changes: the existing suite has no rate-limit assertions on health, and the exemption only makes its readiness polling more robust.

### D9 — `scripts/vercel-ignore.sh`: comment fix + denylist extension

The denylist ("skip Vercel build only if ALL changed files match") gains `Dockerfile`, `.dockerignore`, and `.github/workflows/deploy-api.yml` — deploy-plumbing-only pushes then skip the Vercel build, mirroring the workflow's `paths:` filter in the opposite direction. Mixed pushes (plumbing + web) still build. `ci.yml`/`release.yml` are deliberately **not** added (they affect web versioning/releases). The header comment's "deployed on Railway" becomes Cloud Run.

### D10 — Web-side impact: cold start vs the 5 s fetch timeout

Cloud Run scale-to-zero means the first request after idle pays a ~1–3 s cold start (instance boot + NestJS init; `--cpu-boost` is on by default for new services and helps). The web fetch helper uses `AbortSignal.timeout(5000)` — 5 s comfortably covers cold start + response, and critically, **the user never waits on it**: the fetch runs inside ISR background revalidation (`revalidate: 86400`), so a cold-starting BFF only slows the background refresh, never a page render. **Decision: keep the 5 s timeout unchanged** — no bump needed. (If field evidence later shows tightness, a modest bump to e.g. 8 s is a pre-approved minor adjustment with justification — noted here so it doesn't need a new spec.)

### D11 — Cost model (always-free tier)

Cloud Run request-based billing free tier (Tier 1 regions, e.g. `us-central1`): **2 M requests/month, 180,000 vCPU-seconds, 360,000 GiB-seconds** — this project's volume is hundreds of requests/month, orders of magnitude under every limit. The free tier requires an **active billing account** (card on file) — the runbook states this up front and recommends a billing alert. Ancillary costs: Artifact Registry storage (first 0.5 GB-month free; each image is ~100–120 MB compressed, so several SHA tags fit — occasional cleanup or a cleanup policy keeps it trivial), Cloud Logging (30-day retention on the free tier, 50 GB/month ingestion free — replaces Railway's 7-day logs, per the I11 rewording). Region choice is the user's (runbook); Tier 1 regions keep the free-tier numbers above.

## State Management

No application state changes. The API remains stateless (no DB, no volumes; the dataset is `dist/data/water-footprint.json` resolved via `__dirname`). The only "state" introduced is infrastructure configuration, all of it declarative and versioned: the workflow YAML (trigger, auth, service flags, env vars), the Dockerfile/.dockerignore, and the five GitHub variables documented in the runbook. Cloud Run revisions provide the deploy history/rollback mechanism (traffic rollback to a previous revision), replacing anything Railway would have provided.

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| npm stops silently skipping an absent workspace (`apps/web` excluded from context) in a future npm | Low (verified on npm 11.12.1; behavior stable across npm 10/11) | Documented fallback: `!apps/web/package.json` exception + one COPY line (D3). First workflow run is the definitive test. |
| `prune-lockfile`'s lockfile inconsistency (rxjs version, missing transitives) | Certain if used | Design avoids it entirely: `npm install` inside `dist` with overrides copied (D2). If NX fixes `prune-lockfile` later, the Dockerfile can switch back to `npm ci` for stricter reproducibility. |
| `npm install` (not `ci`) in `dist` — transitive versions could drift between builds | Low (all direct deps exact-pinned; overrides pinned) | Accepted at this scale; noted as a future hardening option (commit a generated lockfile or fix upstream). |
| WIF/IAM propagation delay (~5 min) makes the first deploy fail | Medium (documented behavior) | Runbook explicitly waits ~5 minutes after setup; troubleshooting section covers the auth-error symptom. |
| First deploy happens before the user sets `CORS_ORIGIN` | Low | Pre-flight step fails fast naming the missing variable. |
| Startup probe timeout (bad image/entrypoint) | Low | Deploy health check fails the workflow; traffic stays on the last healthy revision; troubleshooting entry with `gcloud run services logs read`. |
| Free-tier overrun / surprise bill | Very low (hundreds of requests vs 2 M) | Runbook: billing-alert recommendation + free-tier numbers; scale-to-zero means no idle billing. |
| `@SkipThrottle` pull-forward collides with P2 later | None | P2's stack table row is marked done by this change in the ROADMAP update. |
| User rejects the `@eco-metrics/shared` manifest change | — | Fallback image strategy documented (D2) — full root `node_modules`, zero manifest changes, ~1 GB image. |
