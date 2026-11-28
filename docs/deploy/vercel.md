# Gate Vercel production deploys on CI and the API deploy

This runbook makes the `apps/web` production deployment on Vercel wait for the CI check and the production API deploy before it is promoted to the production domains.

## Why the gate exists

Vercel's Git integration builds `main` and promotes it to production independently of GitHub Actions, so a merge to `main` with red or unfinished CI could go live. The repository's `main` ruleset only blocks deletion and force pushes; it does not require status checks, because `release.yml` pushes release commits straight to `main` and a required check would reject them. Nothing on GitHub prevents merging a PR with failing CI, so **Vercel Deployment Checks is the only server-side enforcement for the web app**. The local husky `pre-push` hook only blocks direct pushes to `main` from a developer machine.

The API is gated by GitHub Actions: the `deploy-api-production` (`main`) and `deploy-api-development` (`develop`) jobs in `.github/workflows/ci.yml` each `needs` the CI job and the `api-image` job (see [`cloud-run.md`](./cloud-run.md)). `api-image` is deliberately not a Vercel check: the web app does not depend on the API image.

The web production deployment also waits for the **production API deploy job**, a second Deployment Check. A web change that depends on a new or reshaped endpoint would otherwise go live against the old API (new endpoints answer `404` and the page shows the error page; a new page has no cached previous version to fall back to). Vercel still builds in parallel with CI; only the assignment to the production domains waits.

## Which API each environment consumes

| Vercel environment                    | `API_BASE_URL` points at               | API deployed from |
| ------------------------------------- | -------------------------------------- | ----------------- |
| Production                            | `eco-metrics-api` (production service) | `main`            |
| Preview (pull requests and `develop`) | `eco-metrics-api-dev` (dev service)    | `develop`         |

Previews therefore never read from or load the production API. Setup steps are in [`cloud-run.md`](./cloud-run.md#14-wire-up-vercel).

## One-time setup (dashboard)

Only the project owner can do this; it is a Vercel dashboard setting, not code.

1. **Enable automatic production aliasing** (prerequisite). In the Vercel project, open **Settings → Environments → Production** (or **Settings → Git**, depending on the dashboard version) and make sure production deployments are assigned to the production domains automatically. Deployment Checks hold the assignment of the domains until the checks pass.
2. **Add the Deployment Check.** Open **Settings → Build and Deployment → Deployment Checks → Add Checks**, choose **GitHub** under _Import from GitHub_, then in **Select checks to add** paste the SHA of a commit whose CI run reported the job, turn on **Show All Checks** and select the job named exactly:

   ```
   Format, Lint, Typecheck, Build & Test
   ```

   Do this only after the CI changes are on `develop` and a run shows that job name.

3. **Add the API deploy check.** The same way (SHA of a `main` commit, **Show All Checks**), add the second check, named exactly:

   ```
   Deploy API (production) / Build and deploy API to Cloud Run (production)
   ```

   Order matters: merge the change, wait for a run on `main` that reports this name, and only then add it. Vercel cannot select a check that has never reported; if you type a name that never reports, production deployments wait forever (see troubleshooting). Never add a check from **Send workflow updates to Vercel**: that section is for the `vercel/repository-dispatch` action, which this repository does not use, so such a check never reports.

## API deploy check: the two-file name contract

The check name is built from two files: the caller job `name: Deploy API (production)` of `deploy-api-production` in `.github/workflows/ci.yml`, plus `/`, plus the reusable job `name: Build and deploy API to Cloud Run (${{ inputs.target }})` in `.github/workflows/deploy-api.yml` with `target: production`. Both carry a contract comment, and `apps/api/__tests__/scripts/deploy-api-check-name.test.ts` composes the name and fails when it no longer matches the string above.

- **Symptoms of a break:** after a rename, changing `target` or moving the job, Vercel waits forever for a check that never reports, or (if the check is removed from the dashboard) stops enforcing it.
- **Rename procedure:** change both files, the test and this document, and update the Vercel setting in the same change.
- **Manual dispatch:** a `workflow_dispatch` run of `Deploy API` reports `Build and deploy API to Cloud Run (production)` without the caller prefix, so it is not part of the gate.
- **What `success` means:** on a run that deploys, the last step (`Verify the new revision serves traffic`) fails the job unless the new revision is ready, runs the image just built, receives 100 percent of the traffic, and answers `/api/v1/health`. Without it a pinned-traffic rollback would let the web be promoted against the old API. When change detection finds no API change the deploy steps are skipped and the job succeeds in well under a minute (runner start, checkout, auth and change detection).

## Job-name coupling

Checks are identified by the GitHub Actions **job name**. The job `ci` in `.github/workflows/ci.yml` carries a comment marking its name as a contract. It is a gate: it verifies nothing itself and succeeds only when the `checks` job and every E2E shard (`E2E (shard <n>/4)`) succeeded, so adding or removing shards never touches Vercel. Select only the gate; the verification jobs have their own names and are not part of the Deployment Check. On `main` the gate always reports `success` or `failure`; off `main` a superseded run reports it as `skipped`. If the job is renamed, update the Deployment Check in Vercel in the same change; otherwise Vercel waits for a check that never reports, or stops enforcing it. On docs-only commits whose base revision passed CI, the job `Format, Lint, Typecheck, Build & Test` still runs and reports; only the shards' install and `E2E` steps may be skipped.

## What is and is not gated

- **Gated:** production deployments (branch `main`). Each one is held until both checks pass on the same commit: the CI job and the production API deploy job (see the two-file name contract above).
- **Not gated, by design:** previews (pull requests and `develop`). They build immediately so feedback stays fast; gating them adds no production safety.
- **Release commits are skipped.** `release.yml` pushes `chore(release): ...` commits with `[skip ci]`; they never receive CI, so a gated deployment of them would wait forever. `scripts/vercel-ignore.sh` skips the Vercel build for commit messages starting with `chore(release):` (they only change versions, changelogs and lockfile metadata). The `chore: back-merge main into develop` commit lands on `develop`, which is not gated, so it is not special-cased.
- **Verified on the first gated merge to `main` (PR #98, 2026-11-27).** The merge's deployment was `READY` within minutes, yet `eco-metrics.earth` and `eco-metrics-earth.vercel.app` kept serving the previous production deployment (PR #97) while the CI job ran (19 min). They moved to the new deployment only after the CI job and the API deploy job (an API change, so it deployed and verified traffic) both passed; no manual promotion was needed. The four `chore(release): ...` commits that followed show as `CANCELED` in Vercel: that is how the ignored build step appears, and they never hold or replace production. Not observed yet: how Vercel treats a skipped API deploy job, and whether re-running a failed one releases the held deployment; record them here when they happen.
- **Bypass.** **Force Promote** on the deployment page promotes a deployment without waiting for the checks. Use it only deliberately (for example a hotfix when CI itself is broken, or a failed API deploy when the web change does not depend on the API change).
- **Develop previews accept a short window.** Previews have no checks, and CI cancels older runs on `develop`, so a preview may briefly talk to an older dev API. The window is bounded by one CI run: change detection diffs against the serving SHA, so the next green push deploys every API change accumulated since.

### Failure and recovery

| Situation                              | API deploy check                | Web production                          | Recovery                                                                             |
| -------------------------------------- | ------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| API unchanged                          | `success` after detection       | promoted once both checks pass          | none                                                                                 |
| API changed, deployed and verified     | `success` after the deploy      | promoted after the deploy               | none                                                                                 |
| API deploy or verification fails       | `failure`                       | held; previous deployment keeps serving | fix and push (detection retries), re-run the failed job, or deliberate Force Promote |
| CI fails                               | job `skipped`, never a pass     | held by the CI check                    | fix and push                                                                         |
| Run superseded or cancelled off `main` | `skipped` for that commit       | older commit's web held, never promoted | none: the newer commit includes it and is gated on its own checks                    |
| Manual dispatch of `Deploy API`        | different name, not in the gate | unaffected                              | n/a                                                                                  |

### Backward-compatible API contracts

The gate removes the window in the normal case but not for API rollbacks or Force Promote. As guidance (not enforced by tooling): add endpoints and fields to the API in one change and consume them in the web in a later one; remove or reshape them only after the web no longer uses them.

## Sentry variables

The web build reads `NEXT_PUBLIC_SENTRY_DSN` (public, Production and Preview) and `SENTRY_AUTH_TOKEN` (type Secret, Production and Preview; used only to upload source maps). Vercel applies variables only to new builds, so redeploy after changing them. See [`sentry.md`](./sentry.md).

## Troubleshooting

### A production deployment is stuck waiting for a check

1. Open the commit on GitHub and look for a CI run containing the job `Format, Lint, Typecheck, Build & Test` on that SHA.
2. If the commit message contains `[skip ci]`, no CI ran. Release commits are skipped by `scripts/vercel-ignore.sh`; any other `[skip ci]` commit that changes web inputs on `main` is held until you use Force Promote.
3. If the CI run exists but the job has a different name, the job was renamed: restore the name or update the Deployment Check.
4. If CI failed, fix it and push again; the new commit's deployment is gated on its own CI run.

### A production deployment is stuck waiting for the API deploy check

1. Open the commit's CI run and find the job `Deploy API (production) / Build and deploy API to Cloud Run (production)`. If it is running, wait: an API change deploys for a few minutes, and deploys of the same target queue behind each other.
2. If it failed, the web stays held on purpose and the previous deployment keeps serving. Read the failed step: `Verify the new revision serves traffic` failing on traffic is a pinned rollback (see [`cloud-run.md`](./cloud-run.md#the-verify-the-new-revision-serves-traffic-step-fails)). Fix and push, re-run the failed job, or use Force Promote only when the web change does not depend on the API change.
3. If no such job exists for the commit, or it has a different name, the contract was broken (see the two-file name contract above): restore the name, or remove the check from **Deployment Checks** and re-add it after a run reports the new name.
4. A `cancelled` job means a newer commit replaced the pending run; that older commit's web is never promoted, which is expected.

### Previews still build before CI finishes

Expected. Only production is gated.
