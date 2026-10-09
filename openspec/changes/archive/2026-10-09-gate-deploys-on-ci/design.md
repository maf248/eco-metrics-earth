# Design: gate-deploys-on-ci

## Verified facts

- GitHub reusable workflows: a job that calls a reusable workflow supports `if`, `needs`, `permissions` and `concurrency`. `GITHUB_TOKEN` permissions granted by the caller can only be downgraded by the callee, so the caller job must grant `contents: read` and `id-token: write`. Docs warn against using the same concurrency group in caller and callee, and `${{ github.workflow }}` inside a called workflow resolves to the **caller's** name, so deploy concurrency uses a literal group. `github.event_name`, `github.ref` and `github.sha` inside a called workflow are the caller's.
- Repository configuration `vars` are expected to be available in a called workflow of the same repository; this is confirmed only on the first real run (risk R3).
- Vercel Deployment Checks (https://vercel.com/docs/deployment-checks): available on all plans for projects connected through Vercel for GitHub; Vercel holds each production deployment until all selected checks pass before assigning the production domains; checks are identified by the GitHub Actions **job name**; automatic production aliasing must be on; "Force Promote" on the deployment page bypasses. It is a dashboard setting.
- `npm ci --dry-run` in the pruned `apps/api/dist` detects the lockfile/package.json mismatch in seconds (verified), and with a single rxjs the real install gives 129 packages, clean `npm ls --omit=dev`, bootable `node main.js` (verified, see proposal).
- Docker is not accessible to the agent (`permission denied` on `/var/run/docker.sock`); the user runs the local `docker build` validation.
- Scripts are not unit-tested today. The web app already has Node-environment Jest tests for non-React code (`apps/web/__tests__/e2e/readiness.test.ts` uses `@jest-environment node`).

## Architecture decisions

### D1. Gate the API deploy: reusable workflow called from `ci.yml` with `needs`

```
ci.yml                                  deploy-api.yml (workflow_call + workflow_dispatch)
 jobs:                                   jobs:
  ci  "Format, Lint, ... & Test"          deploy  (concurrency: deploy-api, cancel-in-progress: false)
   concurrency: per ref (job-level)         checkout (full history) -> preflight -> auth
  deploy-api  "Deploy API"                  -> detect changes -> login/build/push/deploy (conditional)
   needs: ci
   if: push && ref == develop
   permissions: contents: read, id-token: write
   uses: ./.github/workflows/deploy-api.yml
```

- `deploy-api.yml` keeps `workflow_dispatch` for manual deploys and gains `workflow_call`; its `push` trigger and `paths:` filter are removed. Dispatch always deploys the dispatched ref and skips change detection. Dispatching from a branch runs that branch's YAML, which is how workflow changes are tested before merge.
- Caller job in `ci.yml`: `needs: ci`, `if: github.event_name == 'push' && github.ref == 'refs/heads/develop'`, `permissions: { contents: read, id-token: write }`. Top-level `permissions` stay `contents: read`. The caller does not pass `secrets: inherit` (the callee only reads `vars`).
- The deployed image tag stays `github.sha`, which is the commit CI just validated.
- **Concurrency lives only in the callee's `deploy` job**, with the literal group `deploy-api` and `cancel-in-progress: false`. One place means manual dispatch and automatic deploys share the group with no duplication and no caller/callee clash. With `cancel-in-progress: false`, GitHub keeps one running and at most one pending run per group; a newer pending run replaces an older pending one ("newest pending wins"). A replaced pending deploy is harmless because change detection (D2) diffs against the deployed SHA, so the next run still sees every change.
- **CI concurrency moves from workflow level to the CI job**: group `${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` (same semantics as today). A workflow-level group would also cancel a running deploy when a newer push starts a new run. If the CI job is cancelled, `needs` makes the deploy job skip, so a superseded run never deploys.
- The CI job keeps its exact name **`Format, Lint, Typecheck, Build & Test`**. It is now a contract with Vercel Deployment Checks; a YAML comment says so, and the caller job is named `Deploy API` so no job name is duplicated.

### D2. Change detection replaces the `paths:` filter

A `workflow_call` run (skipped for `workflow_dispatch`) executes, after the GCP auth step and with `fetch-depth: 0`:

1. Read the serving image: `gcloud run services describe eco-metrics-api --region "$GCP_REGION" --project "$GCP_PROJECT_ID" --format='value(spec.template.spec.containers[0].image)'`, take the tag after the last `:`.
2. Fail safe to **deploy** when the read fails or yields no value (first deploy, service deleted, transient error), when the tag is not a 40-hex SHA, or when `git cat-file -e "<sha>^{commit}"` fails (SHA unknown after a force-push on `develop`, which is allowed).
3. Otherwise `git diff --name-only <deployed_sha> <github.sha>` and match against the same list the old `paths:` filter used: `apps/api/**`, `packages/shared/**`, `Dockerfile`, `.dockerignore`, `.github/workflows/deploy-api.yml`, `package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `nx.json`, `tsconfig.base.json`, `tsconfig.json`. Any match → deploy.
4. Write `deploy=true|false` to `$GITHUB_OUTPUT`, log deployed SHA, target SHA, matched files and decision, and append the same to `$GITHUB_STEP_SUMMARY`. Later steps (registry login, build/push, CORS prep, deploy, URL print) carry `if: steps.detect.outputs.deploy == 'true'` or the `workflow_dispatch` equivalent.

Decisions and justifications:

- **Diff against the deployed SHA, not `HEAD~1` or the push `before` SHA.** CI cancels superseded runs on a ref, so intermediate commits may never reach the deploy job; diffing the whole range from what is actually serving covers them. It also self-heals after a failed deploy.
- **`ci.yml` is not in the path list.** A change to CI steps does not alter the image; the wiring of the caller job is verified by the first real run and by `workflow_dispatch`. This keeps behavior identical to today's list (only `deploy-api.yml` itself triggers on workflow changes).
- **Pattern matching is a plain shell `grep -E` over the diff** (anchored alternatives mirroring `paths:` semantics). A third-party paths-filter action would add a supply-chain dependency and a token scope for forty lines of readable shell, and it reads the GitHub API push event rather than the deployed state.
- Running detection after auth costs ~10 s on skipped runs but avoids a second authentication path; skipped runs build nothing.
- Skipped runs show as successful, with the reason in the summary, so a green pipeline with no new revision is explainable.

### D3. Reproducible image

- Root `package.json` gets `"rxjs": "7.8.2"` in `overrides` (exact, alphabetical between `readdirp` and `smol-toml`). The lockfile is regenerated with a **real** `npm install` (not `--package-lock-only`: a simulation also added unrelated `@tailwindcss/oxide-wasm32-wasi/node_modules/*` entries). The coder diffs the lockfile and investigates any churn beyond the rxjs dedupe instead of committing it.
- Dockerfile builder step becomes `cd apps/api/dist && npm ci --omit=dev --ignore-scripts --no-audit --no-fund`. Removed: the override-injection `node -e`, `rm -f package-lock.json`, `--legacy-peer-deps`, and the comment claiming the lockfile is inconsistent (replace with a comment on why the pruned lockfile is authoritative).
- **Root overrides are no longer injected into `dist/package.json`.** They are already applied when the root lockfile is resolved, and the pruned lockfile carries the resolved versions (e.g. the `multer` pin); `npm ci` installs exactly those. Injecting would add a second source of truth and make `npm ci` compare overrides that the pruned lockfile root entry does not record. The verification showed installs succeed either way, so the simpler form wins. If `npm ci` unexpectedly rejects the pruned lockfile in the Docker build, the coder stops and reports rather than re-adding the injection. Security pins are checked by `npm ls multer` inside the image (user step) and stay covered by the lockfile.
- No `--legacy-peer-deps` for the dist install: it was only needed to paper over the inconsistent lockfile. `.npmrc` (with `legacy-peer-deps=true`, I05) is not copied into `dist`, so the dist install uses strict peer resolution; verified clean.
- Fixing the lockfile also removes the dual-rxjs runtime risk in local dev and tests (`@nestjs/*` and api code now share one instance). The unit and E2E suites are the regression net; no behavior change is intended.

### D4. CI guard for the pruned lockfile

New CI step after `Build` and before `Test`: `npx nx run api:prune` then `npm ci --omit=dev --ignore-scripts --dry-run` with `working-directory: apps/api/dist`. `npm run build` already built `api` (so `api:prune` reuses the `build` result from the NX cache and runs only `prune-lockfile` and `copy-workspace-modules`). NX caching is left on: `prune-lockfile` inputs include the root lockfile and API sources, so a cache hit is a valid result; the cache is not persisted across CI runs anyway. Dry-run installs nothing and runs in seconds. Failure message is npm's own (`Invalid: lock file's X does not satisfy Y`), which names the offending package.

### D5. Web production gate: Vercel Deployment Checks

User-executed dashboard configuration documented in a new `docs/deploy/vercel.md`: ensure automatic production aliasing is on (prerequisite), add a Deployment Check selecting the GitHub Actions job `Format, Lint, Typecheck, Build & Test`, understand the job-name coupling (renaming requires updating the setting), the Force Promote bypass, and that only production (`main`) is gated. Develop and PR previews still build before CI, by design: previews are for early review and gating them would slow the feedback loop for no production safety. The runbook states plainly that this is the only enforcement because GitHub branch protection is unavailable on the current plan.

`AGENTS.md` "Branch strategy" is corrected: remove "protected" / "Requires CI pass + 1 PR review" / "Branch protection enforces this" and the admin-override note; state that there is no server-side protection on the current plan, the husky pre-push hook blocks local direct pushes to `main`, and production safety comes from the CI gates (API deploy `needs` CI; Vercel Deployment Check). Add conventions: the CI job name is a contract with Vercel; the API deploys only through the CI gate (or deliberate `workflow_dispatch`).

### D6. Base image stays floating

`node:24-alpine` remains unpinned in this change. A digest pin without an automated updater (Dependabot for `docker` and `github-actions`) would freeze OS and Node security patches. A new ROADMAP item (I14) tracks "pin base image by digest + Dependabot (docker + github-actions)". Out of scope here.

### D7. `vercel-ignore.sh` skips release commits

The first statement of the script (before the `VERCEL_GIT_PREVIOUS_SHA` guard) is:

```bash
case "$VERCEL_GIT_COMMIT_MESSAGE" in
  'chore(release):'*) exit 0 ;;
esac
```

Rationale: `[skip ci]` release commits never receive CI, so with the Deployment Check enabled their production deployment would be held forever. They only change version fields (no runtime reads them), changelogs and lockfile metadata, so skipping the build is safe, and it removes a wasted Vercel build per release. The `chore: back-merge main into develop [skip ci]` commit on `develop` is **not** handled: previews are ungated, so it cannot hang, and its content (already-released code) is just a preview build; adding it would widen the match for no benefit. Merge commits of PRs into `main` are not matched and run through CI normally.

Tests: `apps/web/__tests__/scripts/vercel-ignore.test.ts` with `@jest-environment node`, following the existing Node-environment pattern in `apps/web/__tests__/e2e/`. Each test builds a temporary git repository (`git init`, committer identity via `-c user.name/-c user.email`, two commits with chosen files), runs `bash <repo>/scripts/vercel-ignore.sh` with `cwd` set to the temp repo via `spawnSync` and env `VERCEL_GIT_*`, and asserts `status`. This is the lightest idiomatic option: no new dependency (no bats/shellcheck, not installed), it runs in the existing `npm run test` and CI, and it exercises the real script. Placed in `apps/web` because the script serves the web project's `ignoreCommand` and the web Jest project is already Node-capable; it adds a few seconds at most, and the script is not imported so coverage thresholds are unaffected.

### D8. I11 compatibility

I11 will deploy production from `main` and a dev service from `develop`. This design supports that without re-architecture: the caller condition `github.ref == 'refs/heads/develop'` becomes two caller jobs (or a matrix) with `main` → `eco-metrics-api` and `develop` → `eco-metrics-api-dev`; change detection already takes the service name, which becomes an input of the reusable workflow; the concurrency group becomes per-service (`deploy-api-<service>`). A note is added to ROADMAP I11. Not implemented here; the coder keeps the service name in one place (a workflow-level `env`/input) to ease this.

## Alternatives considered

- **`workflow_run` on `CI`.** Rejected: `workflow_run` always executes the YAML from the default branch (`main`), so edits to the deploy workflow on `develop` would not apply until merged to `main`, and the switch-over would freeze automatic deploys until then; it needs extra event, branch and conclusion filtering, has no `paths:` filter, and appears as a separate run that is harder to follow. A reusable workflow plus `needs` runs the caller's own commit and shows one pipeline.
- **Deploy job inside `ci.yml` with workflow-level concurrency.** Rejected: CI's `cancel-in-progress` would cancel a deploy that is already running when a newer push arrives, potentially leaving a half-finished rollout.
- **Deploy job inline in `ci.yml` (no reusable workflow).** Rejected: it would remove `workflow_dispatch` testing of the deploy YAML from a branch and make `ci.yml` own Cloud Run details.
- **Keep `paths:` by adding it to `ci.yml`.** Rejected: `paths:` is a trigger-level filter and cannot apply to one job; splitting CI by paths would weaken CI.
- **`npm ci --omit=dev -w api` from the root lockfile in the builder.** Tested, fails at boot (hoisted rxjs is dev-flagged). The duplication is the real problem.
- **Fixing `prune-lockfile` or committing a hand-edited pruned lockfile.** Rejected: the cause is the root resolution, not Nx; a root override is one line and also fixes the dual instance in dev.
- **Third-party paths-filter action** (e.g. `dorny/paths-filter`). Rejected, see D2.
- **Branch protection / rulesets.** Not available on the current plan; tracked by the documented limitation.
- **Gating Vercel by making production deploys manual or disabling Git integration.** Rejected: loses the automatic flow; Deployment Checks is the supported mechanism.

## Risk assessment

- **R1. Deployment Check keyed on a job name.** Renaming the job silently breaks the gate (Vercel would wait for a check that never reports, or ignore it). Mitigation: contract comment in `ci.yml`, spec requirement, runbook warning, and AGENTS.md convention.
- **R2. Release commits hang production on Vercel.** `[skip ci]` commits have no CI. Mitigation: D7 skip rule plus tests. Residual: any other `[skip ci]` commit touching web inputs on `main` would be held until Force Promote; documented in the runbook.
- **R3. `vars` may not resolve in the called workflow.** Documented as expected to work for same-repo callers, but unconfirmed. Mitigation: the pre-flight step fails clearly; user step 3 confirms on the first real run; fallback is to pass the five required values and `CORS_ORIGIN_PATTERN` as `workflow_call` inputs from the caller (`${{ vars.X }}`), a mechanical change.
- **R4. `gcloud` unavailable or lacking permission for `describe`.** `ubuntu-latest` ships `gcloud`, and `github-deployer` holds `roles/run.admin`. Any failure falls into the fail-safe, so the worst case is an unnecessary deploy, never a skipped required one.
- **R5. Change detection skips a needed deploy.** Possible only if the path list misses an image input. Mitigation: same list as the old filter (reviewed against the Dockerfile `COPY`s); the Dockerfile and `.dockerignore` are in the list; manual dispatch always available. The decision is logged.
- **R6. Lockfile regeneration churn.** A plain `npm install` may touch unrelated entries. Mitigation: mandatory lockfile diff review; investigate before committing; `npm ls rxjs` shows a single instance; full test suite and E2E-free gates run.
- **R7. Removing the nested rxjs changes behavior of dev tooling** (`@angular-devkit` pinned 7.8.1 now gets 7.8.2). Patch-level difference within the same minor; verified build and tests green by the gates.
- **R8. A queued deploy waits behind a long one.** Acceptable: deploys take ~3 minutes and newest pending wins.
- **R9. Dry-run guard slows CI.** Seconds; `api:prune` is cached by the preceding build.
- **R10. Docker-only regressions invisible to the agent.** Mitigation: explicit user-executed local `docker build`, run, `npm ls --omit=dev`, and health check before closing the change.
