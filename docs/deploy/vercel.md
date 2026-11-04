# Gate Vercel production deploys on CI

This runbook makes the `apps/web` production deployment on Vercel wait for the CI check before it is promoted to the production domains.

## Why the gate exists

Vercel's Git integration builds `main` and promotes it to production independently of GitHub Actions, so a merge to `main` with red or unfinished CI could go live. The usual guard, GitHub branch protection or rulesets, is **not available**: the repository is private on GitHub Free and the API answers `403 Upgrade to GitHub Pro or make this repository public`. Nothing on GitHub prevents merging a PR with failing CI, so **Vercel Deployment Checks is the only server-side enforcement for the web app**. The local husky `pre-push` hook only blocks direct pushes to `main` from a developer machine.

The API is gated differently: the `deploy-api-production` (`main`) and `deploy-api-development` (`develop`) jobs in `.github/workflows/ci.yml` each `needs` the CI job and the `api-image` job (see [`cloud-run.md`](./cloud-run.md)). `api-image` is deliberately not a Vercel check: the web app does not depend on the API image.

## Which API each environment consumes

| Vercel environment                    | `API_BASE_URL` points at               | API deployed from |
| ------------------------------------- | -------------------------------------- | ----------------- |
| Production                            | `eco-metrics-api` (production service) | `main`            |
| Preview (pull requests and `develop`) | `eco-metrics-api-dev` (dev service)    | `develop`         |

Previews therefore never read from or load the production API. Setup steps are in [`cloud-run.md`](./cloud-run.md#14-wire-up-vercel).

## One-time setup (dashboard)

Only the project owner can do this; it is a Vercel dashboard setting, not code.

1. **Enable automatic production aliasing** (prerequisite). In the Vercel project, open **Settings → Environments → Production** (or **Settings → Git**, depending on the dashboard version) and make sure production deployments are assigned to the production domains automatically. Deployment Checks hold the assignment of the domains until the checks pass.
2. **Add the Deployment Check.** Open **Settings → Deployment Checks** and add the GitHub Actions job named exactly:

   ```
   Format, Lint, Typecheck, Build & Test
   ```

   Do this only after the CI changes are on `develop` and a run shows that job name.

## Job-name coupling

Checks are identified by the GitHub Actions **job name**. The job `ci` in `.github/workflows/ci.yml` carries a comment marking its name as a contract. The job runs inside the `mcr.microsoft.com/playwright` container; this does not affect the check name. If the job is renamed, update the Deployment Check in Vercel in the same change; otherwise Vercel waits for a check that never reports, or stops enforcing it.

## What is and is not gated

- **Gated:** production deployments (branch `main`). Each one is held until the check passes on the same commit.
- **Not gated, by design:** previews (pull requests and `develop`). They build immediately so feedback stays fast; gating them adds no production safety.
- **Release commits are skipped.** `release.yml` pushes `chore(release): ...` commits with `[skip ci]`; they never receive CI, so a gated deployment of them would wait forever. `scripts/vercel-ignore.sh` skips the Vercel build for commit messages starting with `chore(release):` (they only change versions, changelogs and lockfile metadata). The `chore: back-merge main into develop` commit lands on `develop`, which is not gated, so it is not special-cased.
- **Verify on the first gated merge to `main`.** Vercel documents the hold for "custom production domains"; confirm that `eco-metrics-earth.vercel.app` keeps serving the previous deployment until CI passes. If it updates earlier, the gate does not cover that domain.
- **Bypass.** **Force Promote** on the deployment page promotes a deployment without waiting for the checks. Use it only deliberately (for example a hotfix when CI itself is broken).

## Troubleshooting

### A production deployment is stuck waiting for a check

1. Open the commit on GitHub and look for a CI run containing the job `Format, Lint, Typecheck, Build & Test` on that SHA.
2. If the commit message contains `[skip ci]`, no CI ran. Release commits are skipped by `scripts/vercel-ignore.sh`; any other `[skip ci]` commit that changes web inputs on `main` is held until you use Force Promote.
3. If the CI run exists but the job has a different name, the job was renamed: restore the name or update the Deployment Check.
4. If CI failed, fix it and push again; the new commit's deployment is gated on its own CI run.

### Previews still build before CI finishes

Expected. Only production is gated.
