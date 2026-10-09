# Design

## Context

Today `ci.yml` calls `deploy-api.yml` after the CI job passes on `develop` and deploys the only Cloud Run service, `eco-metrics-api`. Vercel production follows `main` (gated by Deployment Checks); Vercel previews (pull requests and `develop`) consume the same production API through `API_BASE_URL`. `deploy-api.yml` already keeps the service name in a single `env.SERVICE` so that this split is mechanical. GCP auth (WIF + `github-deployer` with `roles/run.admin`), Artifact Registry repo `eco-metrics`, the runtime service account and the `internal-api-key` secret all exist and are reused.

## Goals / Non-Goals

**Goals:** production API follows `main` like the web app; previews and `develop` get a dedicated backend; one reusable deploy workflow parametrized by target; per-target concurrency; image churn bounded.

**Non-Goals:** GitHub Environments, separate GCP project/secret/service account, dev-specific app behavior, per-PR backends, app code changes.

## Decisions

### D1 — A `target` input, not a `service` input

The reusable workflow takes `target: production | development` and derives everything from it in one "Resolve deploy target" step (service name, origin variable, pattern variable). Passing raw service names or CORS values from the caller would spread the mapping across `ci.yml` and the dispatch form; a single enum keeps the dispatch UI safe (a choice list) and the mapping in one `case` statement. Unknown values fail before any GCP call.

### D2 — Repository variables with a `_DEV` suffix instead of GitHub Environments

GitHub Environments would let both targets use the same variable names and add deployment-branch rules, but the repository is private on GitHub Free, where environment variables and deployment branch policies are unavailable (`AGENTS.md` already documents that protection features return 403 on this plan). Production keeps the existing names (`CORS_ORIGIN`, `CORS_ORIGIN_PATTERN`), so production needs no migration; dev adds `CORS_ORIGIN_DEV` (required for that target) and `CORS_ORIGIN_PATTERN_DEV` (optional). Selection happens in bash (`case`), not with `a && b || c` expressions, because an empty optional variable would make the expression fall through to the wrong branch.

### D3 — Per-target concurrency group `deploy-api-${{ inputs.target }}`

The group keeps a literal prefix and never uses `${{ github.workflow }}` (which resolves to the caller inside a called workflow). Same-target deploys still queue and never cancel a running rollout; a dev deploy never waits for a production deploy. `inputs.target` is available in the job-level `concurrency` expression for both `workflow_call` and `workflow_dispatch`.

### D4 — Production dispatch only from `main`

Before this change a dispatch from any branch deployed production — the only way to test workflow edits. With a dev service, workflow edits are tested by dispatching `development` from the branch, so any production run (dispatched or called) is restricted to `refs/heads/main` (pre-flight failure otherwise). This is a guard against human error, not a security boundary (anyone who can edit the workflow can remove it); real enforcement would need environment protection, unavailable on this plan.

### D5 — Same image registry path for both targets

Both targets push `.../eco-metrics/api:<sha>`. Pushing the same SHA twice (e.g. dispatching both targets on one commit) re-pushes an identical tag, which is harmless. Separate image names would double storage with no benefit. Change detection reads the serving image of the target's own service, so each target diffs against what it actually runs.

### D6 — Shared runtime identity and secret

`eco-metrics-api-dev` runs as the same runtime service account (Compute Engine default, unless configured otherwise), which already has `secretAccessor` on `internal-api-key`; the deployer's `roles/run.admin` covers creating the second service and the existing `iam.serviceAccountUser` binding covers acting as the runtime account. Vercel Preview already holds the same key value, so a separate secret would add setup without reducing exposure. A separate key is a documented optional hardening.

### D7 — Artifact Registry cleanup policy versioned as JSON

Two services roughly double the image churn. The policy keeps the 20 most recent versions and deletes versions (tagged or not) older than 90 days that fall outside that set. Keeping a count (not only an age) protects the production image when `main` lags `develop` by many dev deploys; 20 × ~120 MB stays near the 0.5 GB free storage only loosely, so the runbook flags the trade-off (lower the count for strict $0, at the cost of rollback depth). The workflow never deletes images; the policy is applied once by the user with `--dry-run` first.

## Risks / Trade-offs

- **R1 — Cutover window.** The push that carries this change makes `develop` deploy to the (not yet existing) dev service, which then fails pre-flight if `CORS_ORIGIN_DEV` is missing, and production stops following `develop`. Mitigation: the runbook orders the steps — set `CORS_ORIGIN_DEV` before pushing; the first `develop` push creates the dev service automatically (detection falls back to deploy); then point Vercel Preview at it; production updates on the next `develop` → `main` merge.
- **R2 — Production lags `develop`.** API fixes no longer reach production on push to `develop`. This is the intended behavior (aligned with web); a hotfix goes through a `develop` → `main` PR or a `production` dispatch from `main`.
- **R3 — Release commits.** `release.yml` pushes `[skip ci]` commits to `main` and back-merges into `develop`; they change `package.json`/`package-lock.json`, so the next deploy of each target rebuilds even without API changes. Harmless (a few CI minutes).
- **R4 — Stale CORS pattern on production.** Once previews use the dev service, `CORS_ORIGIN_PATTERN` on production is unnecessary; removing the variable does not remove the env var already on the service (deploy action merges env vars) — the runbook gives the `--remove-env-vars` command.
- **R5 — Cold starts on dev.** The dev service is mostly idle; the first preview request after idle pays ~1–3 s. Accepted.

## Migration Plan

1. User sets `CORS_ORIGIN_DEV` (and optionally `CORS_ORIGIN_PATTERN_DEV`) as repository variables.
2. Push to `develop` → CI → development deploy creates `eco-metrics-api-dev`.
3. User verifies the dev URL and sets Vercel Preview `API_BASE_URL` to it; redeploys a preview.
4. Merge `develop` → `main` → CI on `main` → production deploy (detection against the serving production SHA).
5. User trims production CORS (pattern no longer needed) and applies the cleanup policy.

Rollback: revert the commit; production then deploys from `develop` again on the next push. The dev service can be deleted with `gcloud run services delete eco-metrics-api-dev`.
