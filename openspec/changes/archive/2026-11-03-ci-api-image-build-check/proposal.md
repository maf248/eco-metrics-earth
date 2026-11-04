# Proposal: Build the API Docker image in CI (no push)

## Why

Today the API container image is built only in `.github/workflows/deploy-api.yml` (step `Build and push container image`), which runs **after** merge on `develop` / `main`. A broken base image (typically the weekly Dependabot `docker` digest PR against `develop`), a `Dockerfile` edit, or an API dependency change therefore fails only at deploy time, on a protected branch, after the damage to the integration branch is done. CI already guards part of the risk (`api:prune` + `npm ci --dry-run`), but it never runs the real `docker build`.

## Goals

- Build the API image with the repository `Dockerfile` on every push and pull request **without publishing it**, so an image that cannot be built fails CI on the branch/PR instead of at deploy time.
- Build only when a file that is an input of the image changed, using the **same list of paths** the deploy workflow uses to decide whether to deploy. The list lives in one committed file read by both workflows so the two cannot drift.
- Reuse Docker layers between runs (GitHub Actions cache backend) so the common case is fast.
- Make the deploy jobs wait for the image build check, so a red image build on `develop` / `main` never deploys.
- Keep the contract of the existing CI job (`Format, Lint, Typecheck, Build & Test`) untouched.

## Non-Goals

- Pushing the image anywhere (no registry login, no `push: true`, no image artifact).
- Changing the build/push step, the change detection semantics, or any other behavior of `deploy-api.yml`. Only the source of the path list changes (it is read from a file); the resulting decisions must be identical.
- Changing the Vercel Deployment Check or the name/steps/container of the `ci` job. The web app does not depend on the API image.
- Running the built image (no container start, no smoke test, no health probe). Out of scope; may be proposed separately.
- Adding a new test framework. The detection script is covered with the existing Jest setup (same approach as `scripts/vercel-ignore.sh`).

## Impact

- `.github/workflows/ci.yml`: new job `api-image` (`Build API image (no push)`) on `ubuntu-latest`; `deploy-api-production` and `deploy-api-development` get `needs: [ci, api-image]`.
- `.github/workflows/deploy-api.yml`: the inline `PATTERN` is replaced by a read of the shared pattern file. Behavior unchanged.
- New `scripts/api-image-inputs.pattern` (single source of truth for the image-input path list) and `scripts/detect-api-image-changes.sh` (diff-based decision for the CI job), plus a Jest test under `apps/web/__tests__/scripts/`.
- Docs: `AGENTS.md` (CI/CD gates), `README.md` (CI section), `docs/deploy/cloud-run.md` (change-detection section and troubleshooting), `docs/deploy/vercel.md` (one sentence: the new job is not part of the Vercel check). `ROADMAP.md`: the completed item is removed and later IDs are renumbered.
- Specs: `ci-workflow` (ADDED + one MODIFIED), `api-cloud-run-deploy` (ADDED).
- CI cost: one extra job on pushes that touch image inputs; skipped (job succeeds in seconds) otherwise.
