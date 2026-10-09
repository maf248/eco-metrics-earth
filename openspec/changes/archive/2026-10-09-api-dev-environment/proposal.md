# Proposal

## Why

The API has a single Cloud Run service (`eco-metrics-api`) that deploys on every push to `develop`, and every Vercel Preview deployment consumes it. Unreleased API changes therefore reach production before the web app that depends on them is released (Vercel production follows `main`), and previews can only be tested against production data and behavior ("staging-is-production", ROADMAP I01). ROADMAP I11 resolves this with a dedicated development backend at no extra cost (the Cloud Run free tier is shared per billing account and both services scale to zero).

## What Changes

- **BREAKING (deploy flow):** the production service `eco-metrics-api` deploys from `main` (after CI passes on the merge commit) instead of `develop`. API changes reach production when the `develop` → `main` PR is merged — the same moment the web app reaches production.
- A second Cloud Run service, `eco-metrics-api-dev`, deploys from `develop` (after CI passes), with the same image, probe, resources, and scale-to-zero as production.
- `deploy-api.yml` takes a required `target` input (`production` | `development`) for both `workflow_call` and `workflow_dispatch`. The target resolves the service name and its CORS variables in one place. The concurrency group becomes per target (`deploy-api-production`, `deploy-api-development`), still a literal-prefixed name and never `${{ github.workflow }}`.
- `ci.yml` has two gated deploy jobs: `main` → `production`, `develop` → `development`.
- New repository variables for the dev service: `CORS_ORIGIN_DEV` (required for `development`) and `CORS_ORIGIN_PATTERN_DEV` (optional). Production keeps `CORS_ORIGIN` / `CORS_ORIGIN_PATTERN`.
- A manual `production` dispatch is allowed only from `main`; `development` can be dispatched from any ref (this is how deploy workflow edits are tested now, without touching production).
- An Artifact Registry cleanup policy file is versioned in the repo and applied by the user, to bound the extra image churn.
- Runbook (`docs/deploy/cloud-run.md`), Vercel doc, `AGENTS.md` (CI/CD gates), and `ROADMAP.md` are updated.

## Non-Goals

- No GitHub Environments: the repository is private on GitHub Free, where environment variables and deployment branch policies are unavailable. Repository variables with a `_DEV` suffix are used instead.
- No separate GCP project, Secret Manager secret, or runtime service account for dev. The dev service reuses `internal-api-key` (the same value Vercel Preview already holds).
- No dev-specific app behavior (Swagger stays disabled, `NODE_ENV=production`, same rate limits). No changes to `apps/api` or `apps/web` source code.
- No PR-scoped preview backends (one dev service for all previews).
- No change to the CI job itself (name, steps, gates).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `api-cloud-run-deploy`: the deploy workflow becomes target-aware (production/development), deploys two services from two branches, uses per-target concurrency and variables, restricts production dispatches to `main`, and documents an Artifact Registry cleanup policy.
- `ci-workflow`: the "running deploy survives a newer push" scenario references the per-target concurrency group.

## Impact

- `.github/workflows/deploy-api.yml`, `.github/workflows/ci.yml`.
- New `docs/deploy/artifact-registry-cleanup-policy.json`.
- Docs: `docs/deploy/cloud-run.md`, `docs/deploy/vercel.md`, `AGENTS.md`, `ROADMAP.md`.
- External configuration done by the user (not in the repo): GitHub repository variables, Cloud Run (the dev service is created by the first deploy), Artifact Registry cleanup policy, Vercel Preview `API_BASE_URL`.
- No application code, dependency, or test changes.
