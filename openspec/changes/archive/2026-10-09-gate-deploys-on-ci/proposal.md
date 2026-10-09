# Proposal: gate-deploys-on-ci (ROADMAP P3)

## Why

Production can receive code that CI has not approved, on both deploy paths, and the API image is not reproducible.

1. **The API deploy does not wait for CI.** `deploy-api.yml` (push to `develop` with a `paths:` filter, plus `workflow_dispatch`) and `ci.yml` (push to every branch, PR to `main`) are independent workflows that start in parallel on the same push. On 2026-10-08 the deploy finished in 2m57s while CI took 6m46s. `eco-metrics-api` is the production service (staging-is-production, ROADMAP I01), so an image with failing tests can be live minutes before CI turns red.
2. **The web production deploy does not wait for CI either.** Vercel's Git integration builds and promotes production from `main` independently of GitHub Actions. The repository is private on GitHub Free, where branch protection and rulesets are unavailable (the API answers `403 Upgrade to GitHub Pro or make this repository public`), so nothing prevents merging a PR to `main` with red or unfinished CI. `AGENTS.md` currently claims `main` "Requires CI pass + 1 PR review before merge" and that "Branch protection enforces this"; that is inaccurate and is corrected here.
3. **The API image is not reproducible.** The `Dockerfile` runs `nx run api:prune`, discards the pruned `package-lock.json`, injects the root `overrides` into `dist/package.json` and runs `npm install --omit=dev --legacy-peer-deps`: transitive dependencies are re-resolved against the registry on every build.
4. **Root cause of the "inconsistent pruned lockfile".** `npm ci` on the pruned lockfile fails with `Invalid: lock file's rxjs@7.8.1 does not satisfy rxjs@7.8.2`. In the root lockfile `node_modules/rxjs` is 7.8.1, pinned exactly by the dev tooling `@angular-devkit/core` and `@angular-devkit/schematics`, while `apps/api` declares rxjs 7.8.2, which npm nests at `apps/api/node_modules/rxjs` (the only nested dependency of the api workspace; `node_modules/concurrently/node_modules/rxjs` is another 7.8.2 copy). Nx `prune-lockfile` takes the hoisted 7.8.1, which contradicts the pruned `package.json`. The same split means two rxjs copies coexist at runtime in local dev and tests (`@nestjs/common`/`core` resolve 7.8.1, the api code resolves 7.8.2) — a latent dual-instance bug (`instanceof Observable` across copies). An alternative, `npm ci --omit=dev -w api` from the root lockfile, was tested and fails at boot (`Cannot find package 'rxjs' imported from node_modules/@nestjs/common/...`) because the hoisted root rxjs is flagged dev, confirming duplication is the real problem.
5. **Verified fix.** Adding root `overrides.rxjs = "7.8.2"` and regenerating the lockfile yields one `node_modules/rxjs` 7.8.2 (production), removing both nested copies. With it, `npm ci --omit=dev --ignore-scripts` on the pruned lockfile (with or without root overrides injected into `dist/package.json`) installs exactly 129 packages, `npm ls --omit=dev` is clean and `node main.js` boots. `--legacy-peer-deps` was not needed, and `npm ci --dry-run` in the pruned dist detects the inconsistency in seconds.
6. **Release commits are never CI'd.** `release.yml` (push to `main`) runs semantic-release for root, web and api, which pushes `chore(release): ... [skip ci]` commits to `main` (version bumps, changelogs, lockfile sync) and back-merges into `develop` with `[skip ci]`. They never get a CI run. They touch `apps/web/package.json`, so `scripts/vercel-ignore.sh` does not skip them and Vercel builds them (the current `main` HEAD is such a commit, with a Vercel status and no CI check). Neither app reads its `package.json` version at runtime. Once the web production deploy waits for CI, these deployments would wait forever unless they are skipped.

## Goals

- The automatic API deploy runs only after the CI job `Format, Lint, Typecheck, Build & Test` has passed for the same commit, by calling the deploy as a reusable workflow from `ci.yml` with `needs` (not `workflow_run`).
- Replace the lost `paths:` filter by change detection inside the deploy workflow: diff the commit currently serving on Cloud Run against the commit being deployed, over the same path list; fail safe to deploy.
- Keep `workflow_dispatch` for manual deploys (always deploys, tests workflow changes from a branch).
- Make the API image reproducible: one rxjs via a root override and a regenerated lockfile, `npm ci --omit=dev --ignore-scripts` from the pruned lockfile, no lockfile discard, no `--legacy-peer-deps`.
- Guard the pruned lockfile in CI (`api:prune` + `npm ci --dry-run`), so a future inconsistency fails the PR, not the deploy.
- Gate the web production deploy on the same CI job through Vercel Deployment Checks (a documented, user-executed dashboard step), and make `scripts/vercel-ignore.sh` skip `chore(release):` commits, with automated tests for the script.
- Keep the gate translatable to the future dev/production split (ROADMAP I11): only the branch filter and target service change.
- Correct the inaccurate branch-protection claims in `AGENTS.md` and record the new conventions (CI job name is a contract; deploys only through the CI gate).

## Non-Goals

- No `workflow_run` trigger and no deploy job living inside `ci.yml` with workflow-level concurrency (rejected, see design).
- No third-party paths-filter action; change detection is a small shell step.
- No GitHub branch protection, rulesets, required reviews or plan upgrade; none are available on the current plan.
- No gating of Vercel preview deployments (develop and PR previews keep building before CI, by design).
- No pinning of `node:24-alpine` by digest and no Dependabot setup; tracked as a new ROADMAP item (a digest pin without an automated updater would lose security patches).
- No implementation of I11 (dev Cloud Run service), no second service, no new GitHub variables.
- No change to the Cloud Run service configuration, env vars, secrets, startup probe or the SHA tagging scheme.
- No change to runtime behavior of the API or web app; no E2E changes.
- No rollback automation, post-deploy smoke tests, or notifications.
- No upgrade of `@angular-devkit/*` or other dev tooling to remove the exact rxjs pins; the override is the fix.
- No change to the release flow (`release.yml`) itself.

## Impact

- **package.json / package-lock.json**: root `overrides.rxjs = "7.8.2"`; lockfile regenerated with a real `npm install` (diff limited to the rxjs dedupe).
- **Dockerfile**: builder installs production dependencies with `npm ci --omit=dev --ignore-scripts` from the pruned lockfile; override injection, `rm -f package-lock.json`, `--legacy-peer-deps` and the stale comment removed.
- **`.github/workflows/deploy-api.yml`**: becomes a reusable workflow (`workflow_call` + `workflow_dispatch`), `push` trigger and `paths:` filter removed, job-level literal concurrency, full-history checkout, change-detection step, conditional build/push/deploy steps.
- **`.github/workflows/ci.yml`**: workflow-level concurrency moved to the CI job; new lockfile guard step; new `deploy-api` caller job (`needs` CI, develop pushes only); job-name contract comment.
- **`scripts/vercel-ignore.sh`**: skips `chore(release):` commits; new Jest test `apps/web/__tests__/scripts/vercel-ignore.test.ts`.
- **Vercel (manual)**: automatic production aliasing and a Deployment Check on the CI job.
- **Docs**: `docs/deploy/cloud-run.md` (trigger, sections 11 and 15, troubleshooting), new `docs/deploy/vercel.md`, `apps/api/README.md` (Deploy), `AGENTS.md` (branch strategy correction, CI conventions), `ROADMAP.md` (P3 closed and removed, Plan de Accion and status table updated, I11 note, new I14).
- **Specs**: `api-cloud-run-deploy` (one renamed and modified trigger requirement, the modified image and runbook requirements, three added requirements), new `ci-workflow`, new `web-production-deploy-gate`.
- **Behavior change**: a failing CI blocks API deploys and (once the Vercel check is enabled) web production promotion; pushes that do not change api inputs no longer start a build; release commits no longer trigger Vercel builds.
