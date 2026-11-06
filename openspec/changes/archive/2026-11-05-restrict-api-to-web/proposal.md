# Proposal: restrict-api-to-web

## Goals

The repo is public and the Cloud Run API is `--allow-unauthenticated` with no instance cap, so anyone can drive up GCP cost. The API exists only for this project's web app.

- Reject with `401` every request without a valid `X-Internal-Api-Key`, except the liveness probe `GET /api/v1/health`.
- Keep rate limiting in two tiers: 300 req/60 s per IP per instance with a valid key, 30 req/60 s without.
- Require `INTERNAL_API_KEY` at startup when `NODE_ENV=production`.
- Hard instance cap on both Cloud Run services: `--max-instances=2` production, `1` development.
- Remove the hardcoded production backend URL from all tracked files.

## Non-Goals

- No Cloud Run IAM / OIDC auth, ingress restriction, Cloud Armor, or shared throttler storage.
- No change to the web app code, CORS, `TRUST_PROXY_HOPS`, or ISR behavior.
- No git history rewrite.

## Impact

- `apps/api`: `InternalKeyGuard` + `@AllowKeyless()`, two-tier throttler, Joi rule, `main.ts` drops the production Swagger server, tests.
- `apps/web/e2e`: direct API calls send the E2E key; `rate-limit.spec.ts` rewritten.
- `.github/workflows/deploy-api.yml`: `--max-instances` per target.
- Docs: `README.md`, `ROADMAP.md`, `apps/api/README.md`, `apps/api/.env.example`, `docs/deploy/cloud-run.md`, `AGENTS.md`.
- Production behavior: anonymous callers get `401`/`429`; the Vercel web app is unaffected (it already sends the key).
