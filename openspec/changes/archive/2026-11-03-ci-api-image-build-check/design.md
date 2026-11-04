# Design: Build the API Docker image in CI (no push)

## Technical approach

### Files

| File                                                          | Change                                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `scripts/api-image-inputs.pattern`                            | New. One line: the extended regex (ERE) of image-input paths. Single source of truth. |
| `scripts/detect-api-image-changes.sh`                         | New. Decides `build=true` or `build=false` for the CI job from a base and head SHA.   |
| `.github/workflows/ci.yml`                                    | New job `api-image`; deploy jobs `needs: [ci, api-image]`.                            |
| `.github/workflows/deploy-api.yml`                            | `PATTERN=$(cat scripts/api-image-inputs.pattern)` instead of the inline literal.      |
| `apps/web/__tests__/scripts/detect-api-image-changes.test.ts` | New Jest test (temporary git repos, same technique as `vercel-ignore.test.ts`).       |
| `AGENTS.md`, `README.md`, `docs/deploy/*.md`, `ROADMAP.md`    | Doc sync (see tasks).                                                                 |

### Decision 1: separate job, not a step of `ci`

New job `api-image`, name `Build API image (no push)`, `runs-on: ubuntu-latest` (a Docker daemon is available; the `ci` job runs inside the Playwright container where there is none). The `ci` job is not touched, so the Vercel contract name, its `needs` relationships and its timeout stay as they are. The new job runs in parallel with `ci`, so it adds no wall-clock time to the existing gate.

- `permissions: contents: read` (job-level, same as the workflow default). The `type=gha` cache backend authenticates with the runner-provided cache token, not with `GITHUB_TOKEN` scopes, so no extra permission is expected. This is verified in the first real CI run (task list), not assumed.
- Own job-level `concurrency`: group `${{ github.workflow }}-api-image-${{ github.ref }}`, `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`, mirroring `ci` (superseded runs are cancelled except on `main`; deploy jobs are never affected because the concurrency is job-scoped).
- `timeout-minutes: 15`. A cold build is a few minutes (`npm ci` + Nx build + prune + production `npm ci`); the limit fails a hung build fast instead of the 6 h default.
- Steps: `Checkout` (`fetch-depth: 0`) -> `Detect api image changes` (id `detect`, runs the script) -> conditional `Set up Docker Buildx` -> conditional `Build API image (no push)`. All conditional steps use `if: steps.detect.outputs.build == 'true'`.

### Decision 2: detection in a step, never a job-level `if`

A job skipped through a job-level `if` has result `skipped`, and a `needs` on a skipped job skips the dependent job too (unless the dependent uses `always()`-style conditions). Running the job always and gating only the expensive steps makes the job conclude `success` in seconds when nothing relevant changed, so `deploy-api-*` (`needs: [ci, api-image]`) proceeds normally. The job summary states whether the build ran and why.

### Decision 3: single source of truth for the path list

`scripts/api-image-inputs.pattern` holds exactly the current regex from `deploy-api.yml`:

```
^(apps/api/|packages/shared/)|^(Dockerfile|\.dockerignore|package\.json|package-lock\.json|\.npmrc|\.nvmrc|nx\.json|tsconfig\.base\.json|tsconfig\.json)$|^\.github/workflows/deploy-api\.yml$
```

- `deploy-api.yml` reads it with `PATTERN=$(cat scripts/api-image-inputs.pattern)` in the existing `Detect api-affecting changes` step (the repository is already checked out with full history before that step). Decisions of the deploy detection are byte-for-byte identical to today.
- `detect-api-image-changes.sh` reads the same file and ORs in CI-only extra entries: `^\.github/workflows/ci\.yml$`, `^scripts/api-image-inputs\.pattern$`, `^scripts/detect-api-image-changes\.sh$`.

**Why the extras are CI-only and not in the shared list.** The shared list answers "does this change alter the image that would be deployed?". Editing `ci.yml`, the pattern file or the detection script does not change the image, so putting them in the shared list would make every such edit trigger a Cloud Run deploy of an identical image. They only matter to the CI job: an edit to the job itself, or to the list/script that gates it, must be validated by actually building. `deploy-api.yml` is already in the shared list because a change to it can change the build step. A consequence worth stating: editing the pattern file runs the CI build but does not by itself deploy; if the edit adds a path, a later change to that path will deploy.

### Decision 4: diff base and fail-safe

`detect-api-image-changes.sh` receives `BASE_SHA` and `HEAD_SHA` as environment variables (and optionally writes to `$GITHUB_OUTPUT` / `$GITHUB_STEP_SUMMARY` when set):

- `push`: `BASE_SHA = github.event.before`, `HEAD_SHA = github.sha`.
- `pull_request`: `BASE_SHA = github.event.pull_request.base.sha`, `HEAD_SHA = github.sha` (the merge commit that the PR checkout contains).

The job passes them through `env:` with an expression (`${{ github.event_name == 'pull_request' && github.event.pull_request.base.sha || github.event.before }}`; both operands are non-empty strings in the cases where they are used, so the `&&/||` idiom is safe here).

The script outputs `build=true` whenever there is doubt, and `build=false` only after a successful `git diff` with no match:

1. `BASE_SHA` empty or all zeros (new branch, first push, e.g. every Dependabot branch) -> build.
2. `BASE_SHA` not resolvable as a commit in the clone (force push rewrote history) -> build.
3. `git diff --name-only BASE HEAD` fails -> build.
4. Any changed path matches the shared pattern or a CI-only extra -> build.
5. Otherwise -> no build.

It prints the same kind of log and step summary as `deploy-api.yml` (base, head, matched files, decision with reason). The script always exits 0 after deciding; a crash (unexpected error) fails the step, which fails the job, which is the safe direction.

### Decision 5: layer cache and build action

- `docker/setup-buildx-action@vN` and `docker/build-push-action@vN` (latest stable majors at implementation time; the implementer checks with `gh api repos/docker/<action>/releases/latest` instead of guessing). Same `@vN` style as the rest of the repo; Dependabot's `github-actions` group keeps them current.
- `push: false`, `context: .`, default `Dockerfile`. `load` is not set: the image is not run, so it is not exported to the local daemon.
- `cache-from: type=gha,scope=api-image` and `cache-to: type=gha,mode=max,scope=api-image`. `mode=max` caches the intermediate builder-stage layers (`npm ci`, Nx build), which are the expensive ones. A fixed scope keeps the API image cache separate from any future Docker build. GHA cache entries are branch-scoped and fall back to the default branch, which fits the `develop` -> `main` flow.

### Decision 6: deploy jobs depend on the new job

`deploy-api-production` and `deploy-api-development` use `needs: [ci, api-image]`. Their `if:` conditions, permissions and `with:` are unchanged. A failed or cancelled image build blocks the deploy; a skipped-steps (successful) job does not. The Vercel Deployment Check keeps selecting only `Format, Lint, Typecheck, Build & Test`: the web app does not depend on the API image, so a broken API image must not hold back web production.

### Decision 7: tests

The detection logic is a script, so it is testable with the tooling the repo already has. `apps/web/__tests__/scripts/detect-api-image-changes.test.ts` creates temporary git repositories (same helper style as `vercel-ignore.test.ts`) and asserts `build=true` or `build=false` for: each shared path category, CI-only extras, non-matching paths (docs, `apps/web`), zero SHA, unknown SHA, and a failing diff. It also asserts that `deploy-api.yml` references the pattern file (a string assertion on the workflow, guarding against someone re-inlining the list).

## Alternatives considered

- **Add the build as a step of the existing `ci` job.** Rejected: the job runs in the Playwright container with no Docker daemon; it would also lengthen the Vercel-gated job and entangle the contract job with API-only concerns.
- **Job-level `paths:` filter or job-level `if` on detection output.** Workflow-level `paths:` cannot target one job, and a skipped job blocks `needs` dependents (Decision 2). Rejected in favor of step-level gating.
- **`dorny/paths-filter` or similar third-party action.** Rejected: a new supply-chain dependency, and it cannot express the fail-safe-to-build semantics or share the regex with `deploy-api.yml` without duplicating it.
- **Always build, no path detection.** Simplest, but spends several minutes of runner time on every docs/web push. Kept as the fallback if detection proves flaky; the fail-safe already degrades to this.
- **Duplicate the regex in `ci.yml`.** Rejected: the two lists would drift, which is the failure mode this change exists to prevent.
- **Put the extras (`ci.yml`, pattern file, script) in the shared list.** Rejected (Decision 3): every edit would trigger a no-op deploy.
- **Shared list as a shell/Node module instead of a data file.** A one-line data file is trivially readable from bash in both workflows and from Jest; code would add indirection.
- **`docker build` via `run:` instead of the Docker actions.** Works but has no layer cache across runs without extra wiring; `type=gha` through Buildx is the standard approach.
- **Registry cache (`type=registry`) instead of GHA cache.** Requires pushing cache layers to Artifact Registry, which conflicts with "no publishing" and needs GCP auth in a PR context. Rejected.
- **Smoke-run the container after the build.** Valuable but out of scope (needs `load: true`, env for config validation, a readiness wait). Left as a possible follow-up.

## Risk assessment

| Risk                                                                                    | Mitigation                                                                                                                                                                     |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Detection wrongly skips a build.                                                        | Any doubt builds; the shared list is the one deploy already trusts; unit tests cover every path category and failure branch.                                                   |
| Job-level `if` accidentally reintroduced -> `needs` skip -> deploys silently never run. | Gating is step-level by spec; a scenario asserts the job concludes `success` when no build is needed.                                                                          |
| Editing the pattern file changes what deploy considers an input.                        | Intended single point of change; covered by test asserting the file content and that `deploy-api.yml` reads it.                                                                |
| Dependabot-triggered runs have a read-only token and restricted cache behavior.         | Build does not need write permissions; cache write failures in buildx are non-fatal warnings, but this is **verified on the first Dependabot docker PR** (see open questions). |
| Extra runner minutes (private repo on Free plan).                                       | Detection skips docs/web-only pushes; cache cuts warm builds; concurrency cancels superseded runs.                                                                             |

## Open questions

- Does `type=gha` cache export succeed (not just restore) on Dependabot-authored runs? Observe on the next Dependabot `docker` PR; if it only restores, that is acceptable (the build still runs).
