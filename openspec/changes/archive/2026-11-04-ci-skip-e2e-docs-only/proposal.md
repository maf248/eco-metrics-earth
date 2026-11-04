# Proposal: Skip the CI E2E step on docs-only changes when the base is green

## Goals

- Save GitHub Actions minutes. The repository is private on GitHub Free (2000 min/month); October consumed ~1300. The `ci` job takes ~17 min, of which the `E2E` step is ~12.5 min and grows ~1.5-2 min with every new data category.
- In October, 110 of 163 non-merge commits touched only `*.md` or `openspec/` files. When the previous revision already passed CI, running the browser matrix again for them only re-verifies a tree that is already covered.
- Skip **only the `E2E` step**, and only when it is provably redundant: the diff between the previous revision and the new one is docs-only **and** the previous revision's CI check is known green.
- Keep the guarantee "worst case = E2E ran unnecessarily, never the opposite": every doubt runs E2E.

## Non-Goals

- No E2E sharding (a separate roadmap item, to be done after this one).
- No change to the duplicate CI run on `develop` -> `main` pull requests (`push` + `pull_request`); a separate roadmap item.
- No Vercel changes (`scripts/vercel-ignore.sh`, Deployment Checks settings stay as they are).
- No job-level `if` and no `paths-ignore`. The job `Format, Lint, Typecheck, Build & Test` is a contract with Vercel Deployment Checks and a `needs` of the `deploy-api-*` jobs: it must always run and report.
- Format check, lint, typecheck, build, prune checks and unit tests are NEVER skipped (some Jest tests read `docs/*.md`).
- No new secrets, no repository settings, no PAT: only the automatic `GITHUB_TOKEN`.
- No reuse of the `vercel-ignore.sh` denylist (it contains `apps/api/`, which does need E2E).
- No generalisation of `scripts/detect-api-image-changes.sh`.

## Impact

- `.github/workflows/ci.yml`: `ci` job gains `permissions: { contents: read, checks: read }`, a detection step before `E2E`, and a step-level `if:` on `E2E`.
- New `scripts/docs-only-paths.pattern` (single source of the docs-only regex) and new `scripts/detect-e2e-skip.cjs` (detector with pure decision logic).
- New Jest tests in `apps/web/__tests__/scripts/`.
- Docs: `AGENTS.md` ("CI/CD gates"), `docs/deploy/vercel.md` (note that the check still reports on docs-only commits), and the E2E sharding item in `ROADMAP.md` (first sub-step removed as done).
- Delta spec: ADDED requirements on the existing `ci-workflow` capability.
- Expected effect: ~12.5 min saved on every docs-only push whose base revision is green (CI runs per push, not per commit, so the share of commits above is an upper bound).
