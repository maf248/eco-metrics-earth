## MODIFIED Requirements

### Requirement: Deploy workflow is reusable, manually triggerable, and serializes deploys

`.github/workflows/deploy-api.yml` SHALL exist and SHALL be a **reusable workflow**: it SHALL declare `on: workflow_call` (invoked by the CI workflow after the CI job passes — see "Automatic API deploys are gated by the CI job on the same commit") and `on: workflow_dispatch` (manual deploys, used for first deploys and for ad-hoc redeploys). It SHALL NOT declare a `push` or `pull_request` trigger and SHALL NOT use `workflow_run`. Both triggers SHALL declare a required `target` input whose value is `production` or `development` (`type: string` for `workflow_call`, `type: choice` defaulting to `development` for `workflow_dispatch`). The target is the single source of the deploy environment: `production` deploys the Cloud Run service `eco-metrics-api` and `development` deploys `eco-metrics-api-dev`; any other value SHALL fail the workflow before any GCP call. The mapping from target to service name and CORS variables SHALL live in one place in the workflow. The former `paths:` filter is replaced by in-workflow change detection (see "Automatic deploys are skipped when nothing api-affecting changed since the deployed commit"). A `workflow_dispatch` run SHALL always build and deploy the dispatched ref's HEAD, skipping change detection; it runs the workflow YAML of the ref it is dispatched from. A `production` run (dispatched or called) SHALL be accepted only from `refs/heads/main` and SHALL fail before any GCP call from any other ref; a `development` dispatch is accepted from any ref, which is how changes to the deploy workflow are testable from a branch before merge without touching production. The deploy job SHALL declare `permissions: contents: read, id-token: write` (required for OIDC; for `workflow_call`, the calling job SHALL grant the same, because a called workflow can only downgrade the caller's token permissions) and SHALL declare a job-level `concurrency` group named `deploy-api-${{ inputs.target }}` (the literal prefix `deploy-api-` plus the target, i.e. `deploy-api-production` or `deploy-api-development`) with `cancel-in-progress: false`. The group name SHALL NOT use `${{ github.workflow }}`, which resolves to the caller's name inside a called workflow. Automatic and manual deploys of the same target therefore share one group and queue instead of racing, while deploys of different targets never wait on each other; the concurrency group is declared only in the deploy workflow, not in the caller.

#### Scenario: api-only push deploys

- **GIVEN** a push to `develop` (or `main`) whose CI job passed and where every file changed since the commit currently deployed on that branch's target service matches the api-affecting path list (e.g. only `apps/api/**`)
- **WHEN** the deploy workflow runs
- **THEN** change detection decides to deploy and the image is built, pushed, and deployed to that target's service
- **AND** the Vercel build for the same push is skipped by `scripts/vercel-ignore.sh` (mirror behavior)

#### Scenario: web-only push does not deploy

- **GIVEN** a push to `develop` touching only `apps/web/**`, whose CI job passed
- **WHEN** the deploy workflow runs
- **THEN** change detection finds no api-affecting file between the deployed commit and the pushed commit and the image build, push, and deploy steps are skipped
- **AND** Vercel builds and deploys the web app

#### Scenario: manual dispatch for the first deploy

- **WHEN** the user triggers `workflow_dispatch` from the Actions tab (per the runbook) with a target
- **THEN** the workflow builds and deploys the dispatched ref's HEAD to that target's service regardless of changed paths, without consulting the deployed commit
- **AND** if the service does not exist yet, the deploy creates it

#### Scenario: Deploy workflow changes are testable from a branch

- **GIVEN** a branch that modifies `deploy-api.yml`
- **WHEN** the user dispatches the workflow from that branch with target `development`
- **THEN** the run uses the branch's version of the YAML and deploys `eco-metrics-api-dev`
- **AND** the production service is not touched

#### Scenario: Production dispatch from a non-main ref is rejected

- **GIVEN** a ref other than `main` (e.g. `develop` or `feature/x`)
- **WHEN** the user dispatches the workflow from it with target `production`
- **THEN** the workflow fails before authenticating to GCP with a message stating that production deploys only from `main`
- **AND** no image is built and no revision is created

#### Scenario: Overlapping deploys queue and never cancel a running deploy

- **GIVEN** a deploy running for commit A on a target and a newer commit B (or a manual dispatch) requesting a deploy to the same target
- **WHEN** B reaches the deploy job
- **THEN** B waits in that target's concurrency group (`deploy-api-production` or `deploy-api-development`) until A finishes
- **AND** A is not cancelled

#### Scenario: Deploys of different targets do not block each other

- **GIVEN** a production deploy running
- **WHEN** a development deploy starts
- **THEN** the development deploy runs without waiting for the production deploy

### Requirement: Cloud Run service is configured for scale-to-zero with a health startup probe

The workflow SHALL deploy with `google-github-actions/deploy-cloudrun@v3` to the target's service (`eco-metrics-api` for `production`, `eco-metrics-api-dev` for `development`) in the region from `GCP_REGION`. Both services SHALL receive the same configuration, differing only in the CORS values: a startup probe on `GET /api/v1/health` (container port 8080, e.g. `--startup-probe=httpGet.path=/api/v1/health,httpGet.port=8080,periodSeconds=2,timeoutSeconds=2,failureThreshold=15`); `--min-instances=0` (explicit scale-to-zero); `--allow-unauthenticated` (the BFF is an intentionally public API consumed server-side by Vercel without credentials); explicit resource defaults (`--cpu=1 --memory=512Mi`, free-tier-safe); and env vars `NODE_ENV=production`, `CORS_ORIGIN` (from the target's origin variable — `CORS_ORIGIN` for `production`, `CORS_ORIGIN_DEV` for `development` — a comma-separated list of allowed origins; the workflow escapes `\` and `,` per the deploy action's documented `env_vars` escaping rules so a multi-origin list reaches the service intact instead of being split into bogus entries), `CORS_ORIGIN_PATTERN` (from the target's optional pattern variable — `CORS_ORIGIN_PATTERN` or `CORS_ORIGIN_PATTERN_DEV` — escaped the same way, passed only when the variable is set), `SWAGGER_ENABLED=false`. The workflow SHALL NEVER set a `PORT` env var (Cloud Run injects `PORT=8080`; the app reads it via `AppConfigService.port` and Joi coerces the string). The deploy step's built-in deploy health check (default on) SHALL be relied upon: if the startup probe fails, the workflow fails and traffic stays on the last healthy revision.

#### Scenario: PORT is injected, never configured

- **WHEN** the Cloud Run service configuration is inspected after deploy
- **THEN** `PORT` is not present in the service's env vars — Cloud Run injects it into the container at runtime
- **AND** the app listens on the injected port (Joi `Joi.number().port()` coerces the `8080` string)

#### Scenario: Startup probe gates traffic

- **GIVEN** a revision whose container fails to start (e.g., a bad image, or an invalid `CORS_ORIGIN`/`CORS_ORIGIN_PATTERN` value that fails Joi validation at boot)
- **WHEN** the deploy runs
- **THEN** the startup probe never passes, the deploy step fails, and the previous healthy revision keeps serving traffic

#### Scenario: Scale to zero between traffic

- **WHEN** the service receives no requests
- **THEN** Cloud Run scales the instance count to zero (no idle billing)
- **AND** the next request pays a ~1–3 s cold start, absorbed by the web app's ISR background revalidation

#### Scenario: CORS allows the Vercel production origin

- **GIVEN** `CORS_ORIGIN` set to the Vercel production URL in the GitHub variables
- **WHEN** a browser request from that origin hits any route of the production service (e.g. the Swagger UI in a dev-enabled deployment)
- **THEN** the response carries the appropriate `Access-Control-Allow-Origin` header

#### Scenario: Comma-separated CORS_ORIGIN deploys intact

- **GIVEN** `CORS_ORIGIN` (or `CORS_ORIGIN_DEV`) set to a multi-origin list (e.g. `http://localhost:3000,https://eco-metrics-earth.vercel.app`) in the GitHub variables
- **WHEN** the deploy for the matching target runs
- **THEN** the service's `CORS_ORIGIN` env var contains the full comma-separated list — the value is not split at the first comma into a bogus env var entry
- **AND** a browser request from the second origin receives the appropriate `Access-Control-Allow-Origin` header

#### Scenario: Preview origins allowed when the pattern variable is set

- **GIVEN** `CORS_ORIGIN_PATTERN_DEV` set to an anchored Vercel preview regex (e.g. `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$`) in the GitHub variables
- **WHEN** a browser request from a matching preview origin hits any route of the development service
- **THEN** the response carries the appropriate `Access-Control-Allow-Origin` header

#### Scenario: Targets never share CORS values

- **GIVEN** different values in `CORS_ORIGIN` and `CORS_ORIGIN_DEV`
- **WHEN** each target deploys
- **THEN** `eco-metrics-api` receives only the production values and `eco-metrics-api-dev` receives only the `_DEV` values

### Requirement: Required GitHub variables are documented and fail fast

The workflow SHALL read four **required** repository **variables** shared by both targets (Settings → Secrets and variables → Actions → Variables — none are sensitive credentials): `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, plus one **required** origin variable per target: `CORS_ORIGIN` for `production` and `CORS_ORIGIN_DEV` for `development`. A pre-flight step SHALL fail the workflow with a clear message, naming each missing variable, if any variable required by the selected target is unset; a variable required only by the other target SHALL NOT be checked. The workflow SHALL additionally read one **optional** pattern variable per target: `CORS_ORIGIN_PATTERN` (`production`) and `CORS_ORIGIN_PATTERN_DEV` (`development`) — an anchored regex allowing Vercel preview origins; unset or empty means no pattern is passed to the service. Repository variables are used instead of GitHub Environments because the repository is private on GitHub Free, where environment-scoped variables are unavailable. Because the deploy action merges env vars with the service's existing values, a pattern value deployed earlier persists on the service after its GitHub variable is later unset — removing it requires also clearing it on the service (documented in the runbook's troubleshooting section).

#### Scenario: Missing variable fails before any GCP call

- **GIVEN** a variable required by the selected target unset (e.g. `CORS_ORIGIN_DEV` for `development`)
- **WHEN** the workflow runs
- **THEN** it fails at the pre-flight check with a message naming the missing variable — no auth, build, or deploy is attempted

#### Scenario: The other target's variables are not required

- **GIVEN** `CORS_ORIGIN_DEV` unset and `CORS_ORIGIN` set
- **WHEN** the workflow runs with target `production`
- **THEN** the pre-flight check passes

#### Scenario: Optional pattern variable may be unset

- **GIVEN** the selected target's pattern variable unset or empty in the GitHub variables
- **WHEN** the workflow runs
- **THEN** the pre-flight check passes and the deploy proceeds, passing no `CORS_ORIGIN_PATTERN` env var to the service

### Requirement: Automatic API deploys are gated by the CI job on the same commit

The automatic API deploys SHALL run only as jobs of the CI workflow (`.github/workflows/ci.yml`) that call `./.github/workflows/deploy-api.yml` with `needs:` on the CI job `Format, Lint, Typecheck, Build & Test`. There SHALL be exactly two calling jobs: one with `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` passing `target: production`, and one with `if: github.event_name == 'push' && github.ref == 'refs/heads/develop'` passing `target: development`. Each calling job SHALL grant `permissions: contents: read, id-token: write`, and SHALL use `secrets: inherit` only if the called workflow requires secrets (it currently reads only `vars`, so it SHALL NOT). The image deployed SHALL be built from the same commit SHA that passed CI (image tag = `github.sha`). If the CI job fails or is cancelled, the deploy job SHALL NOT run. Release commits pushed by `release.yml` carry `[skip ci]` and therefore never trigger a deploy on their own.

#### Scenario: Green CI on develop deploys

- **GIVEN** a push to `develop`
- **WHEN** the CI job completes successfully
- **THEN** the development deploy job starts, after the CI job, for the same commit SHA, targeting `eco-metrics-api-dev`
- **AND** the production deploy job is skipped

#### Scenario: Green CI on main deploys the production service

- **GIVEN** a push to `main` (the merge commit of a `develop` → `main` pull request)
- **WHEN** the CI job completes successfully
- **THEN** the production deploy job starts, after the CI job, for the same commit SHA, targeting `eco-metrics-api`
- **AND** the development deploy job is skipped

#### Scenario: Red CI never deploys

- **GIVEN** a push to `develop` or `main` where the CI job fails (format, lint, typecheck, build, test, E2E, or the lockfile guard)
- **WHEN** the workflow run finishes
- **THEN** both deploy jobs are skipped and no image is pushed and no revision is created

#### Scenario: Superseded CI run does not deploy

- **GIVEN** a push to `develop` whose CI job is cancelled because a newer push superseded it
- **WHEN** the cancelled run finishes
- **THEN** its deploy job does not run (the newer push's pipeline decides)

#### Scenario: Other refs and pull requests never deploy

- **GIVEN** a push to a branch other than `develop` or `main`, or a pull request
- **WHEN** the CI workflow runs
- **THEN** both deploy jobs are skipped

#### Scenario: Repository variables resolve inside the called workflow

- **GIVEN** the required repository variables are set
- **WHEN** the deploy workflow runs as a called workflow
- **THEN** the pre-flight step finds all of them (if `vars` do not resolve in the called workflow, the deploy values are passed as `workflow_call` inputs instead — design.md risk R3 of the original deploy change)

### Requirement: Automatic deploys are skipped when nothing api-affecting changed since the deployed commit

After the Google Cloud authentication step, a `workflow_call` run (not `workflow_dispatch`) SHALL decide whether to deploy. The workflow SHALL check out the full history (`fetch-depth: 0`), read the image tag (the commit SHA) currently serving on the **target's** Cloud Run service (`eco-metrics-api` or `eco-metrics-api-dev`), and run `git diff --name-only <deployed_sha> <github.sha>` against the api-affecting path list: `apps/api/**`, `packages/shared/**`, `Dockerfile`, `.dockerignore`, `.github/workflows/deploy-api.yml`, `package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `nx.json`, `tsconfig.base.json`, `tsconfig.json`. If at least one changed file matches, the workflow SHALL build, push, and deploy; otherwise it SHALL skip those steps and finish successfully. The decision and its reason SHALL be logged (and written to the job summary, including the target and service). The detection SHALL fail safe: if the service or its image tag cannot be read (including when the service does not exist yet), if the tag is not a full commit SHA, or if the deployed SHA is not present in the checked-out history (e.g. after a force-push on `develop`), the workflow SHALL deploy. Because it diffs against the deployed commit and not only against the previous commit, a skipped (cancelled) intermediate commit that changed the API still triggers a deploy on the next run. Each target diffs only against its own service, so a deploy of one target never causes the other to be skipped. `.github/workflows/ci.yml` is deliberately not part of the path list (it does not alter the image).

#### Scenario: Intermediate commit was cancelled

- **GIVEN** commit B (changes `apps/api/**`) whose pipeline was cancelled, then commit C (changes only `apps/web/**`) on `develop`, and the development service still serving commit A
- **WHEN** C's CI passes and the deploy job runs
- **THEN** `git diff A C` includes `apps/api/**` and the workflow deploys C

#### Scenario: Production diffs against its own serving commit

- **GIVEN** the production service serving commit P and the development service serving a newer commit D
- **WHEN** a merge commit M that contains D lands on `main` and its CI passes
- **THEN** production change detection runs `git diff P M` (not `git diff D M`)

#### Scenario: Deployed SHA not in history

- **GIVEN** the serving image tag is a SHA that is not an ancestor or otherwise present in the checked-out history
- **WHEN** change detection runs
- **THEN** the workflow logs that the deployed commit is unknown and deploys

#### Scenario: Deployed tag unreadable

- **GIVEN** the service does not exist yet, or its image tag is not a 40-character commit SHA, or the `gcloud` read fails
- **WHEN** change detection runs
- **THEN** the workflow logs the reason and deploys

#### Scenario: Decision is logged

- **WHEN** change detection finishes
- **THEN** the log and job summary state the target, the service, the deployed SHA, the target SHA, the matched files (or none), and the resulting decision (deploy or skip)

## ADDED Requirements

### Requirement: Artifact Registry image retention is bounded by a versioned cleanup policy

The repository SHALL version an Artifact Registry cleanup policy file at `docs/deploy/artifact-registry-cleanup-policy.json`, in the format accepted by `gcloud artifacts repositories set-cleanup-policies --policy=<file>`. The policy SHALL keep the most recent image versions (enough to cover the images serving both services and a rollback margin) and SHALL delete only versions that are both outside that kept set and older than a minimum age. The runbook SHALL document how to preview the policy (`--dry-run`) and apply it to the `eco-metrics` repository. Applying it is a user-executed step; the deploy workflow SHALL NOT delete images.

#### Scenario: Policy file is valid for gcloud

- **WHEN** the user runs `gcloud artifacts repositories set-cleanup-policies eco-metrics --policy=docs/deploy/artifact-registry-cleanup-policy.json --dry-run` with the runbook's location and project flags
- **THEN** the command accepts the file

#### Scenario: Recent images are never deleted

- **GIVEN** an image version among the most recent versions kept by the policy
- **WHEN** the cleanup policy runs
- **THEN** the version is kept even if it is older than the delete condition's age
