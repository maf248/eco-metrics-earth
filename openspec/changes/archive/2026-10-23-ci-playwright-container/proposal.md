# Proposal: Run the CI job inside the official Playwright container

## Why

`npx playwright install --with-deps` installs OS packages with `apt` on every CI run. Three times in about 20 hours (22-23 Oct 2026) the Ubuntu mirror `azure.archive.ubuntu.com` crawled (100-150 packages in 10 minutes, where the whole step normally takes about 45 s), hanging the job. Timeouts now cap the damage (10 min on the step, 30 on the job) but the run is still lost. The official image `mcr.microsoft.com/playwright:v1.63.0-noble` ships Node 24 (same major as `.nvmrc`), all browsers and all OS dependencies, so the `apt` step disappears entirely.

## Goals

- Run the whole existing `ci` job (`Format, Lint, Typecheck, Build & Test`) in `container: mcr.microsoft.com/playwright:v1.63.0-noble`.
- Remove the `Install Playwright browsers` step; CI no longer touches `apt` or downloads browsers.
- Keep the job name and the `needs` of the deploy jobs unchanged, so E2E still gates production and the Vercel Deployment Check keeps working.
- Fail fast, with a message naming the tag to use, when the image's Playwright version differs from the installed `@playwright/test` (Dependabot does not update `container.image`).

## Non-Goals

- No separate E2E job, no job split, no change to the job name or the deploy jobs.
- No change to Playwright projects, tests, `playwright.config.ts` or `run-dev-servers.ts`.
- No container for `release.yml` or `deploy-api.yml`; the Docker build of the API stays outside this job.
- No Dependabot automation for the image tag (documented manual bump instead).
- No change to the Node version policy (`.nvmrc` stays 24, `ci-node-version` spec untouched).
- No browser or image caching.
- ROADMAP edits are handled by the orchestrator, not by this change.

## Impact

- `.github/workflows/ci.yml`: `container` block, `HOME`, guard step, removed Playwright install step, E2E step timeout.
- New `scripts/check-playwright-image.mjs` (version guard).
- Docs: `README.md` (CI description), `AGENTS.md` (CI/CD gates: image pin rule), `docs/deploy/vercel.md` (note that the contract job runs in a container).
- Delta spec on `ci-workflow` (ADDED requirements only).
- Trade-off: each run pulls a ~1.5 GB image from MCR (expected 20-40 s) in exchange for removing the `apt` and browser downloads.
