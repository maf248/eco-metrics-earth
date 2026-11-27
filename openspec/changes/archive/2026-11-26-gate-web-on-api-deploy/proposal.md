# Proposal: Publish the web production deployment only after the API production deploy

## Goals

- When a change touches both the API and the web app, the API is deployed first and the web production deployment is assigned to the production domains only after the new API revision is serving traffic.
- Close the window in which the new web talks to the old API: new endpoints answer `404` and the page that uses them shows the error page (it happened with the ocean-health category on the develop preview), and a changed shape of an existing endpoint could break a page that is already in production. There is no stale-if-error fallback for it: a new page has no cached previous version.
- Do it with the mechanism already in place for CI: add the production API deploy job as a second Vercel Deployment Check, next to the CI job. No new workflow, no new trigger, no new job.
- Make the deploy job's `success` mean what the gate needs: the new Cloud Run revision is the one serving traffic. Add the cheapest post-deploy verification that guarantees it.
- Make the new check name a documented, commented contract, because it is built from two files and breaking either silently disables or deadlocks the gate.
- Add no noticeable pipeline delay beyond the inherent wait for the API deploy itself when the API changed.

## Non-Goals

- No change to Vercel preview behaviour: previews (pull requests and `develop`) stay ungated. The short window on the develop preview is accepted (see design.md, decision D4). CI cancellation on `develop` is not changed.
- No rename of the new check and no restructuring of the deploy workflow into a differently named job. The check keeps its natural name.
- No serialization of the Vercel build behind the API deploy: Vercel still builds in parallel with CI; only the domain assignment waits.
- No change to the CI job name `Format, Lint, Typecheck, Build & Test`, to `api-image`, to change detection, to concurrency or to `scripts/vercel-ignore.sh`.
- No enforcement of backward-compatible API contracts (no contract tests, no schema diffing). The practice is documented as a complement only.
- No automation of the Vercel dashboard setting (it is a manual owner step) and no use of the Vercel API to create checks.
- No gating of a manual `workflow_dispatch` deploy (it reports a different check name and is not part of the gate).
- No change to the post-deploy health semantics of the API itself, and no new API endpoint.
- No rollback automation and no "deploy the web only if the API is compatible" logic.

## Impact

- **Vercel dashboard (manual, by the project owner):** one more Deployment Check, `Deploy API (production) / Build and deploy API to Cloud Run (production)`, added only after a run on `main` has reported that name.
- **`.github/workflows/ci.yml`:** contract comment on the `deploy-api-production` job (name only; no behaviour change).
- **`.github/workflows/deploy-api.yml`:** contract comment on the job name, and one new final step, `Verify the new revision serves traffic`, that runs only when a deploy happened. It is the only workflow behaviour change.
- **Docs:** new sections in `docs/deploy/vercel.md` (the second check, the two-place name contract, failure and recovery matrix, skipped/cancelled behaviour, develop preview window, backward-compatible contracts, troubleshooting) and cross-references plus a traffic-pinning troubleshooting entry in `docs/deploy/cloud-run.md`. `AGENTS.md` "CI/CD gates" gets the contract noted.
- **Tests:** the existing Jest suite that reads `deploy-api.yml` (`apps/api/__tests__/scripts/deploy-api-sentry.test.ts`) may need a case or a re-check that the new step does not disturb it; a small assertion covers the contract comments.
- **Capabilities:** `web-production-deploy-gate` gets new requirements; `api-cloud-run-deploy` gets one new requirement. No existing requirement or scenario is modified or removed.
- **Pipeline timing:** no added time on pushes that do not touch the API beyond the runner start and change detection of the deploy job (tens of seconds, after `ci`); for API changes the web waits for the real deploy. Quantified in design.md.
