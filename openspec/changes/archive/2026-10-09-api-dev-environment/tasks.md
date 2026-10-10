# Tasks

## 1. Deploy workflow

- [x] 1.1 Add a required `target` input to `workflow_call` (string) and `workflow_dispatch` (choice `development`/`production`, default `development`) in `.github/workflows/deploy-api.yml`; remove the job-level `env.SERVICE`.
- [x] 1.2 Change the job concurrency group to `deploy-api-${{ inputs.target }}` (`cancel-in-progress: false`) and update its comment.
- [x] 1.3 Replace the pre-flight step with a "Resolve deploy target" step: map target → service / origin / pattern via `case`, fail on unknown target, fail a `production` dispatch outside `refs/heads/main`, check the shared required variables plus the target's origin variable, expose `service`, `origin`, `pattern` as step outputs.
- [x] 1.4 Use the resolved service in change detection (including the job summary: target + service) and in the deploy step; use the resolved origin/pattern in the CORS escaping step.

## 2. CI workflow

- [x] 2.1 Replace the single `deploy-api` job in `.github/workflows/ci.yml` with `deploy-api-production` (`main`, `target: production`) and `deploy-api-development` (`develop`, `target: development`), each with `needs: ci`, `permissions: contents: read, id-token: write`, and unique job names.

## 3. Artifact Registry

- [x] 3.1 Add `docs/deploy/artifact-registry-cleanup-policy.json` (keep 20 most recent versions; delete versions older than 90 days).

## 4. Docs

- [x] 4.1 Update `docs/deploy/cloud-run.md`: two services, branch mapping, new variables, dispatch targets, cutover order, cleanup policy, troubleshooting commands per service.
- [x] 4.2 Update `docs/deploy/vercel.md` where it states which API Preview consumes.
- [x] 4.3 Update `AGENTS.md` CI/CD gates (two deploy jobs, per-target concurrency group).
- [x] 4.4 Update `ROADMAP.md`: remove I11, renumber later `Ixx` items and cross-references, update I01 and the status table.

## 5. Validation

- [x] 5.1 `npx openspec validate api-dev-environment --strict`.
- [x] 5.2 Lint the workflows (`actionlint` if available, otherwise YAML parse) and `npm run format:check`.
- [x] 5.3 Reviewer audit (CHANGES REQUESTED → fixed: stale `apps/api/README.md` deploy section, cleanup-policy retention caveat, concurrency wording).
- [x] 5.4 Document the post-push verification as user steps (runbook §21: dev service created by the first `develop` deploy, production deployed by the first `main` merge).
