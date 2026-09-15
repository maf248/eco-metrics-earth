# Proposal: Deploy apps/api on Google Cloud Run

> Roadmap item **P3** (`ROADMAP.md`) — rewritten from "Deploy de Railway (apps/api)" to Cloud Run. The Railway trial made the US$5/month Hobby plan unattractive for a portfolio project; Cloud Run's always-free tier covers this project's volume (hundreds of requests/month) at US$0. The user already has a GCP account.
>
> **Spec-writing only for this change's repo side is implemented by @coder later; the GCP/GitHub/Vercel configuration is a user-executed runbook** (`docs/deploy/cloud-run.md`) — the agent never touches the GCP console.

## Goals

- **Deploy the NestJS BFF (`apps/api`) to Google Cloud Run** from `develop`, via a Dockerfile + GitHub Actions workflow committed in the repo, so that after this change is pushed the user only has to follow the dashboard/gcloud runbook to "configurar Cloud Run y salga andando".
- **Replace Railway entirely** as the api deploy target — every tracked Railway reference is swept to Cloud Run equivalents (code comments, READMEs, AGENTS.md, ROADMAP.md, test fixtures, the synced main spec, `scripts/vercel-ignore.sh`). Historical archives under `openspec/changes/archive/**` keep their Railway mentions intentionally (history is not rewritten).
- **Lean, self-contained container image** built with the repo's existing NX `prune` targets (`prune-lockfile` + `copy-workspace-modules`, already configured in `apps/api/package.json` but unused until now): the runtime stage ships only `apps/api/dist` with its own production `node_modules` (~85 MB) — not the ~1 GB workspace tree. Validated end-to-end in a scratch workspace during spec research (isolated `dist` boots, serves `health 200` and the 52 products).
- **Keyless CI/CD authentication** via Workload Identity Federation (OIDC) — no service-account JSON keys anywhere. Image published to Artifact Registry tagged by commit SHA; deployed by `google-github-actions/deploy-cloudrun@v3` with a startup probe on `/api/v1/health`, scale-to-zero (min instances 0), and the always-free tier limits documented.
- **`@SkipThrottle()` on `HealthController`** (pull-forward of a row already in P2's stack table) — the only runtime code change, so the Cloud Run startup probe and E2E readiness polling can never be answered with `429`.
- **Web side unchanged except documentation**: `API_BASE_URL` in Vercel points at the Cloud Run `*.run.app` URL; cold starts (~1–3 s) are absorbed by ISR background revalidation (the user never waits). The existing 5 s fetch timeout is kept — rationale in design.md D10.
- **ROADMAP P3 rewritten** as "P3: Deploy de Cloud Run (apps/api)" with the always-free-tier guidance the user asked for, plus the P2/I02/I03/I11 Railway mentions reworded to Cloud Run equivalents.

## Non-Goals

- **No deploying `apps/web` anywhere but Vercel** — the web deploy story (GitHub Integration + `vercel.json` Ignored Build Step) is untouched except for the denylist comment/extension in `scripts/vercel-ignore.sh`.
- **No custom domains, load balancer, or CDN** in front of Cloud Run — the default `*.run.app` URL suffices for this project.
- **No always-on instances** — scale-to-zero with min instances 0 is the point (free tier). No `--min-instances > 0`, no concurrency/CPU tuning beyond explicit documented defaults.
- **No I02 (PR-preview environments for the API)** — stays backlog; reworded for Cloud Run (no PR-preview equivalent; Vercel previews consume the production BFF — staging-is-production trade-off accepted for now).
- **No I03 (multi-origin CORS)** — server-side fetch means the browser never calls the BFF directly in production; a single `CORS_ORIGIN` (the Vercel production URL) is sufficient. I03 stays backlog, reworded.
- **No P1 providers, no Sentry/P2 implementation, no database** — this change deploys the BFF exactly as it exists today (`water-footprint` + health + demo endpoints).
- **No Vercel configuration changes by the agent** — setting `API_BASE_URL` in the Vercel dashboard (Production AND Preview) is a runbook step for the user; only `.env.example`/README documentation is updated in-repo.
- **No rewriting of `openspec/changes/archive/**`** — old Railway references there are intentional history.
- **No new E2E specs** — the only behavioral change (`@SkipThrottle`) is covered by a unit/integration test; post-deploy verification (health 200, 52 products, page renders) is runbook curl/browser territory, not Playwright against a remote URL. The existing 55-spec E2E suite remains the gate.
- **No CI-gating of the deploy workflow on `ci.yml`** — the deploy workflow runs in parallel with CI; a broken build cannot take down production because Cloud Run's deploy health check (startup probe) keeps traffic on the last healthy revision. Documented trade-off in design.md D4.
- **No commits or pushes** — implementation stops at the mandatory user-approval checkpoint (AGENTS.md SDD workflow step 5). The first real deploy happens only when the user executes the runbook.

## Impact

| Area | Change |
|------|--------|
| `Dockerfile` (repo root) | **ADDED** — multi-stage `node:24-alpine`: builder runs `HUSKY=0 npm ci` → `npx nx run api:prune` → self-contained prod install inside `apps/api/dist` (with the root `overrides` security pins copied in); runtime stage ships only `dist` as `/app`, non-root `USER node`, `NODE_ENV=production`, `CMD ["node", "main.js"]`, `EXPOSE 8080` (documented), no `HEALTHCHECK` (Cloud Run uses service-level startup probes) |
| `.dockerignore` (repo root) | **ADDED** — keeps the context ~4 MB: excludes `node_modules`, `.git`, `.nx`, `apps/web`, build outputs, tests, `openspec`, `docs`, `.env` files, `gha-creds-*.json`; empirically validated that nothing `nx build api` needs is excluded |
| `.github/workflows/deploy-api.yml` | **ADDED** — push-to-`develop` trigger with `paths:` filter (mirror of `scripts/vercel-ignore.sh` in the opposite direction) + `workflow_dispatch` for the first deploy; WIF auth (`google-github-actions/auth@v3`, OIDC, no keys) → docker build/push to Artifact Registry (`:<sha>` immutable tags) → `google-github-actions/deploy-cloudrun@v3` (service `eco-metrics-api`, startup probe `/api/v1/health`, env vars, scale-to-zero, `--allow-unauthenticated`) |
| `apps/api/src/health/health.controller.ts` | **MODIFIED** — `@SkipThrottle()` on the health check (the only runtime code change) |
| `apps/api/__tests__/health/health.controller.test.ts` | **MODIFIED** — behavioral test: a mini-app with `ThrottlerModule` (limit 3) + global `ThrottlerGuard` + the real `HealthController` serves >3 requests to `/health` without `429` |
| `apps/api/package.json` | **MODIFIED** — declares `"@eco-metrics/shared": "*"` as a workspace dependency (see design.md D2 — required for `copy-workspace-modules` to produce a self-contained `dist`; **flagged deviation** from "no code change beyond `@SkipThrottle`", needs user approval) |
| `package-lock.json` (root) | **MODIFIED** — regenerated by `npm install` after the dependency declaration |
| `apps/api/src/main.ts` | **MODIFIED** — removes the Railway `.addServer(...)` line from the Swagger config (re-added with the real `*.run.app` URL as a post-deploy follow-up; see design.md D7) |
| `scripts/vercel-ignore.sh` | **MODIFIED** — comment Railway → Cloud Run; denylist extended with `Dockerfile`, `.dockerignore`, `.github/workflows/deploy-api.yml` so deploy-plumbing-only pushes skip the Vercel build |
| `apps/web/__tests__/lib/apiBaseUrl.test.ts` | **MODIFIED** — fixture URL `*.railway.app` → `*.run.app` example (cosmetic) |
| `apps/web/.env.example` | **MODIFIED** — production comment points at the Cloud Run service instead of Railway |
| `openspec/specs/water-footprint-page/spec.md` | **MODIFIED** — the `API_BASE_URL` scenario example URL switches from the railway.app URL to a `*.run.app` example (direct main-spec sweep fix — not a behavior delta) |
| `docs/deploy/cloud-run.md` | **ADDED** — the user-executed runbook: GCP project/APIs/Artifact Registry/WIF setup, GitHub variables, first deploy, verification curls, Vercel `API_BASE_URL`, path-filter verification pushes, free-tier/billing notes, troubleshooting |
| `README.md` (root) + `apps/api/README.md` | **MODIFIED** — deploy target line → Cloud Run; new Deploy section (Docker build summary + runbook pointer); kept manually identical per the existing convention |
| `apps/api/.env.example` | **MODIFIED** — production notes: `PORT` injected by Cloud Run (never set manually), `CORS_ORIGIN` = Vercel production URL, `SWAGGER_ENABLED=false` + runbook pointer |
| `AGENTS.md` | **MODIFIED** — line 17 deploy targets: "Vercel (web), Cloud Run (api)" |
| `ROADMAP.md` | **MODIFIED** — P3 block rewritten as "P3: Deploy de Cloud Run (apps/api)" with always-free-tier guidance; status-table "CD / Deploy" row updated; P2 `SENTRY_DSN`/stack-table Railway mentions → Cloud Run (and the `@SkipThrottle` row marked done by this change); I02/I03/I11 reworded to Cloud Run equivalents |

**Explicitly unchanged:** `apps/web` sources and behavior (ISR, fetch helper, 5 s timeout, fallback states), the `water-footprint` API contract, `packages/shared` sources, `.github/workflows/ci.yml` and `release.yml`, `vercel.json`, all E2E specs, `openspec/changes/archive/**`.

**Post-deploy follow-ups (user-side, after the first runbook deploy):** re-add the production `.addServer()` Swagger line with the real `*.run.app` URL; set `API_BASE_URL` in Vercel (Production + Preview); optional path-filter verification pushes. These are tasks in tasks.md Group 9 — they close the loop the runbook starts.
