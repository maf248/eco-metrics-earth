# Design: Publish the web production deployment only after the API production deploy

## Current state (verified)

- Vercel builds `main` in parallel with the `ci` job and, with the CI Deployment Check configured, holds only the assignment to the production domains until `Format, Lint, Typecheck, Build & Test` passes.
- `ci.yml` job `deploy-api-production` (`name: Deploy API (production)`, `needs: [ci, api-image]`, `if: push && ref == main`) calls `.github/workflows/deploy-api.yml`, whose job is named `Build and deploy API to Cloud Run (${{ inputs.target }})`. GitHub reports the called job as `Deploy API (production) / Build and deploy API to Cloud Run (production)`.
- `deploy-api.yml`: concurrency `deploy-api-${target}` with `cancel-in-progress: false` (a newer waiting run replaces an older waiting one; the replaced run ends `cancelled`). Steps: checkout (`fetch-depth: 0`), resolve target, authenticate (WIF), change detection (reads the serving image from Cloud Run, diffs against `github.sha`, always `success`), then build, push and deploy only when `deploy=true`.
- `ci` concurrency has `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`: runs on `main` are never cancelled; on `develop` a newer push cancels the older CI run before its deploy job starts.
- `scripts/vercel-ignore.sh` skips Vercel builds of API-only changes and of `chore(release):` commits, so those never wait on the new check.
- `google-github-actions/deploy-cloudrun` fails the step when the revision does not become ready (the startup probe on `/api/v1/health` is configured). It does not guarantee that traffic moved: if the service traffic is pinned to a specific revision (manual rollback via `update-traffic`), a new revision is created and ready but receives 0 percent, and the job would still report `success`.

## Decisions

### D1. Add the existing deploy job as a second Deployment Check; no new job

The gate is one Vercel dashboard entry pointing at a job that already exists and already runs on every push to `main` after CI. No new workflow, job, trigger or step is placed on the critical path of pushes that do not touch the API. This is the cleanest option: the ordering guarantee (API first, web after) comes from Vercel holding the domain assignment, not from custom orchestration.

### D2. The check keeps its natural name; the two-place contract is documented and tested

The reported name is the caller job name plus `/` plus the reusable job name with `target` interpolated. Renaming would need a change in both files for no benefit, so the name stays. To prevent silent breakage:

- A contract comment above `deploy-api-production` in `ci.yml` and above the `deploy` job in `deploy-api.yml`, each naming the other file and `docs/deploy/vercel.md`.
- A small Jest test (Node environment, in the same style as the existing script tests) that reads both workflow files, extracts the two names, composes the full name for `target: production` and asserts it equals the documented string. The workflow files must be listed in that project's `test` target `inputs` in its `package.json` (AGENTS.md testing conventions), keeping the existing entries, so a stale cached pass cannot hide a rename. The existing suite `apps/api/__tests__/scripts/deploy-api-sentry.test.ts` already reads `deploy-api.yml`; the implementer places the new test next to it so the inputs already cover the file, and adds `ci.yml` to the inputs.
- A section in `docs/deploy/vercel.md` and a cross-reference in `docs/deploy/cloud-run.md`, with symptoms: if renamed, Vercel either waits forever for a check that never reports, or (if the check is removed from the dashboard) stops enforcing it. A manual `workflow_dispatch` run reports `Build and deploy API to Cloud Run (production)` without the caller prefix and is not part of the gate.

### D3. `success` must mean "serving": one cheap verification step

The only workflow behaviour change. A final step in `deploy-api.yml`, `if: steps.detect.outputs.deploy == 'true'`, after `Show deployed URL`, so the URL is printed before the verification:

1. `gcloud run services describe "$SERVICE" --region --project --format=json` (credentials from the earlier `google-github-actions/auth` step; `jq` is preinstalled on `ubuntu-latest`).
2. Assert with `jq`: `status.latestReadyRevisionName == status.latestCreatedRevisionName`; `spec.template.spec.containers[0].image == $IMAGE`; the sum of `percent` over `status.traffic[]` entries whose `revisionName == latestReadyRevisionName` equals 100 (tag-only entries at 0 percent do not interfere).
3. `curl --fail --silent --show-error --retry 3 --retry-delay 2 --retry-connrefused --max-time 10 "$URL/api/v1/health"` against `steps.deploy.outputs.url`. The route is throttler-exempt, never calls a provider, and the check cannot cause a cold-start timeout: the startup probe already passed for the new revision.
4. On a traffic mismatch, print the pinned revision and `gcloud run services update-traffic <service> --to-latest ...` as the fix.

Cost: one `describe` (about 2 to 3 s) plus one `curl` (under 1 s warm) only when a deploy happened, which already takes minutes. Nothing runs when `deploy=false`.

Why not just trust the action: pinned traffic after a rollback is a real, documented operation in `cloud-run.md`, and in that case the gate would promote the web against the old API, which is exactly the failure this change prevents. Why not a revision-specific health check: the revision tag URL needs `--tag`, which adds a deploy flag and a revision label; the traffic assertion proves the same thing more simply.

Side note, no change here: change detection reads the image of the service template (latest created revision), not of the revision serving traffic, so after a rollback pin it compares against the newest created revision. The new verification makes that state fail loudly instead of silently, and the runbook entry tells the owner to restore `--to-latest`.

### D4. Develop previews: accept the short window

Previews have no Deployment Checks, and `ci` cancels older runs on `develop` before the dev deploy job starts. Accepted behaviour, not changed: the window is bounded by one CI run because change detection diffs against the serving SHA, so the next green push deploys the accumulated API changes. The runbook says so. Alternative (rejected below) would add cost and complexity for a non-production risk.

### D5. Failure semantics (documented, verified on first gated merge)

| Situation                                | Check result                     | Web production                          | Recovery                                                                                   |
| ---------------------------------------- | -------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| API unchanged                            | `success` after detection        | promoted right after both checks        | none                                                                                       |
| API changed, deploy ok and verified      | `success` after the deploy       | promoted after the deploy               | none                                                                                       |
| API deploy or verification fails         | `failure`                        | held; previous deployment keeps serving | fix and push (change detection retries); or deliberate Force Promote if web is independent |
| CI fails                                 | deploy job `skipped`             | held by the CI check                    | fix and push                                                                               |
| Pending run superseded by a newer commit | `cancelled` for the older commit | older commit's web held, never promoted | none: the newer commit supersedes it                                                       |
| Manual dispatch of the deploy workflow   | different name, not part of gate | unaffected                              | n/a                                                                                        |

A skipped job must never count as a pass. The CI check already holds the web when CI fails, so correctness does not depend on Vercel's treatment of a skipped or unreported second check, but the implementation includes a validation task to confirm and record it (docs/deploy/vercel.md) on the first gated merge or with a deliberately red CI on a throwaway branch merge only if the owner chooses; no production risk is taken to test it.

### D6. Backward-compatible contracts as a complement

The gate removes the window for the normal case but cannot cover rollbacks of the API or a Force Promote. Documented guidance, not enforced: add endpoints and fields to the API in one change, consume them in the web in a later one; remove or reshape only after the web no longer uses them. This matches the existing runbook line "deploy the API before the web for every payload change".

## Pipeline timing (non-functional requirement)

Critical path on `main` today: `ci` (about 14 to 15 min, mostly E2E) then Vercel promotion. Vercel's own build runs in parallel and normally finishes before `ci`. With the second check:

- No new job, no new step on `ci`, no serialization of the Vercel build. The deploy job already starts when `ci` and `api-image` finish (`api-image` is shorter than `ci`, and its change detection skips the build when image inputs did not change).
- API not changed: added wait is the time of the deploy job after `ci`: runner start, checkout with full history, target resolution, WIF auth and `gcloud run services describe` for detection. Estimated 25 to 45 s; the new verification step is skipped. This is measured against the workflow steps above; the implementation records the measured value from the first runs.
- API changed: added wait equals the real deploy (image build and push plus Cloud Run rollout, a few minutes) plus about 5 s of verification. This is the inherent wait the change exists to introduce.
- Releases and API-only changes: skipped by `vercel-ignore.sh`, no deployment, no wait.

## Alternatives considered

1. **Serialize in CI: make the web build wait for the API deploy (Vercel build triggered or blocked by a workflow).** Rejected: delays every web push by the API deploy even when unchanged, needs custom orchestration or the Vercel API, and loses parallelism.
2. **Vercel "Deploy Hooks" fired from the deploy workflow after the API deploy.** Rejected: duplicates the Vercel Git integration, needs a secret, makes releases and previews fork into two paths.
3. **Renaming the check for a short name (rename the caller job or inline the deploy into `ci.yml`).** Rejected by decision: no benefit, and changing structure risks the existing concurrency and contract documentation. The cost is the documented two-place contract.
4. **Not cancelling CI on `develop` to protect previews.** Rejected by decision: longer queues and cost for a non-production window bounded by one run.
5. **Rely on `deploy-cloudrun` success alone, without verification.** Rejected: traffic pinned after a rollback would let the gate pass against the old API.
6. **A revision-tagged URL smoke test (`--tag`, no traffic, then promote).** Rejected: adds a deploy mode and label management for no extra guarantee over the traffic assertion plus health.
7. **GitHub branch protection or required checks.** Unavailable on the plan and incompatible with `release.yml` pushes (documented in `vercel.md`).

## Risks and mitigations

- **Contract drift (rename in one place).** Mitigated by comments in both files, the composed-name Jest test, and the runbook section; residual risk is a manual dashboard mistake.
- **Check added in Vercel before the name has ever reported.** Vercel cannot select it; the runbook orders the steps (merge, wait for a run on `main`, then add). If added by typing, production deployments would wait forever: troubleshooting entry points at the name and at removing the check.
- **Vercel treatment of skipped, cancelled or unreported checks is not fully documented.** Mitigation: the CI check already holds failed-CI commits; a cancelled older commit is intentionally never promoted; validate and record on the first gated merge.
- **A flaky API deploy now blocks the web.** Intended; recovery documented (re-push or Force Promote). Change detection self-heals after a failed deploy.
- **Deploy queue delay.** Deploys of the same target serialize; a commit may wait for a previous deploy (a few minutes). Accepted and bounded by the single waiting slot.
- **Verification false negatives** (health blip). Mitigated by bounded retries; a failure is loud and re-runnable via **Re-run failed jobs**; Vercel re-evaluates the check when the rerun succeeds (confirm on first use and record it in the runbook).
- **Existing test coupling.** `deploy-api-sentry.test.ts` reads `deploy-api.yml`; the implementation re-runs it and keeps its inputs.

## Files touched

- `.github/workflows/ci.yml` (comment only)
- `.github/workflows/deploy-api.yml` (comment and the verification step)
- `docs/deploy/vercel.md`, `docs/deploy/cloud-run.md`, `AGENTS.md` (CI/CD gates bullet)
- `apps/api/__tests__/scripts/` (new contract test) and `apps/api/package.json` (`nx.targets.test.inputs`, if `ci.yml` is not already covered)
- Canonical specs `web-production-deploy-gate` and `api-cloud-run-deploy` via `npx openspec archive` (merge, never overwrite)
