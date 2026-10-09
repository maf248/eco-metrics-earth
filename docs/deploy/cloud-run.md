# Deploy `apps/api` on Google Cloud Run

This runbook configures the GCP project, GitHub Actions OIDC authentication, Artifact Registry, and two Cloud Run services so that the NestJS BFF is built and deployed automatically **after CI passes** (each deploy job `needs` the CI job; a red or cancelled CI never deploys):

| Target        | Cloud Run service     | Deployed from | Consumed by                                      |
| ------------- | --------------------- | ------------- | ------------------------------------------------ |
| `production`  | `eco-metrics-api`     | `main`        | Vercel **Production**                            |
| `development` | `eco-metrics-api-dev` | `develop`     | Vercel **Preview** (pull requests and `develop`) |

Both services run the same image, configuration and runtime identity; only the CORS values differ. API changes reach production when the `develop` → `main` pull request is merged — the same moment the web app does. Already running the single-service setup? Follow [Cutover to two services](#21-cutover-to-two-services-one-time).

> **Prerequisites:** a GCP account with an active billing account (the Cloud Run always-free tier requires a card on file), the `gcloud` CLI installed, and admin access to the `maf248/eco-metrics-earth` GitHub repo and the Vercel project.

## 1. GCP project and billing

1. Open the [GCP Console](https://console.cloud.google.com/).
2. Select an existing project or create a new one (e.g. `eco-metrics-earth`).
3. Make sure a billing account is linked at **Billing → Account overview**.

## 2. Enable the required APIs

Run the following with `gcloud` configured for the chosen project:

```bash
gcloud services enable run.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  --project=<GCP_PROJECT_ID>
```

## 3. Create the Artifact Registry repository

```bash
gcloud artifacts repositories create eco-metrics \
  --repository-format=docker \
  --location=<GCP_REGION> \
  --description="eco-metrics earth API images" \
  --project=<GCP_PROJECT_ID>
```

## 4. Create the GitHub deployer service account

```bash
# Create the service account
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions deployer" \
  --project=<GCP_PROJECT_ID>

# Project-level roles for Cloud Run deploys and image pushes
gcloud projects add-iam-policy-binding <GCP_PROJECT_ID> \
  --member="serviceAccount:github-deployer@<GCP_PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding <GCP_PROJECT_ID> \
  --member="serviceAccount:github-deployer@<GCP_PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Role required for Cloud Run to actAs the Compute Engine default SA
gcloud iam service-accounts add-iam-policy-binding \
  <GCP_PROJECT_NUMBER>-compute@developer.gserviceaccount.com \
  --member="serviceAccount:github-deployer@<GCP_PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser" \
  --project=<GCP_PROJECT_ID>
```

> Replace `<GCP_PROJECT_NUMBER>` with the project number (not the project ID), found via `gcloud projects describe <GCP_PROJECT_ID> --format='value(projectNumber)'`.

## 5. Create the Workload Identity Federation pool and provider

```bash
# Create the workload identity pool
gcloud iam workload-identity-pools create github \
  --display-name="GitHub Actions" \
  --location=global \
  --project=<GCP_PROJECT_ID>

# Create the OIDC provider restricted to this repository
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --workload-identity-pool=github \
  --location=global \
  --display-name="GitHub Actions provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository == 'maf248/eco-metrics-earth'" \
  --project=<GCP_PROJECT_ID>
```

## 6. Grant workload identity access to the deployer SA

```bash
gcloud iam service-accounts add-iam-policy-binding \
  github-deployer@<GCP_PROJECT_ID>.iam.gserviceaccount.com \
  --member="principalSet://iam.googleapis.com/projects/<GCP_PROJECT_NUMBER>/locations/global/workloadIdentityPools/github/attribute.repository/maf248/eco-metrics-earth" \
  --role="roles/iam.workloadIdentityUser" \
  --project=<GCP_PROJECT_ID>
```

> Replace `<GCP_PROJECT_NUMBER>` with the project number (not the project ID). Find it with `gcloud projects describe <GCP_PROJECT_ID> --format='value(projectNumber)'`.

## 7. Extract the provider full name

```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --workload-identity-pool=github \
  --location=global \
  --format='value(name)' \
  --project=<GCP_PROJECT_ID>
```

The output looks like:

```
projects/<GCP_PROJECT_NUMBER>/locations/global/workloadIdentityPools/github/providers/github-provider
```

Save this value as `WIF_PROVIDER`.

## 8. Set the GitHub variables

In the GitHub repo, go to **Settings → Secrets and variables → Actions → Variables** and create these **variables** (not secrets):

| Variable                  | Value / example                                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `GCP_PROJECT_ID`          | `<GCP_PROJECT_ID>`                                                                                                                           |
| `GCP_REGION`              | `us-central1` (or another Tier 1 region for the free-tier numbers above)                                                                     |
| `WIF_PROVIDER`            | `projects/<GCP_PROJECT_NUMBER>/locations/global/workloadIdentityPools/...`                                                                   |
| `WIF_SERVICE_ACCOUNT`     | `github-deployer@<GCP_PROJECT_ID>.iam.gserviceaccount.com`                                                                                   |
| `CORS_ORIGIN`             | **Production** service. Comma-separated list of exact origins, e.g. `https://eco-metrics-earth.vercel.app`                                   |
| `CORS_ORIGIN_PATTERN`     | **Production** service, optional anchored regex. Leave unset: previews use the dev service                                                   |
| `CORS_ORIGIN_DEV`         | **Dev** service. Comma-separated list of exact origins, e.g. `http://localhost:3000,https://eco-metrics-earth-git-develop-<team>.vercel.app` |
| `CORS_ORIGIN_PATTERN_DEV` | **Dev** service, optional anchored regex for Vercel previews, e.g. `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$`                     |

> The workflow escapes commas and backslashes in these values automatically before passing them to `deploy-cloudrun`, so store the raw value in the GitHub variable (no manual escaping).
>
> The four GCP/WIF variables are shared by both targets. The pre-flight step checks only the variables the selected target needs: `CORS_ORIGIN` for `production`, `CORS_ORIGIN_DEV` for `development`. Repository variables (not GitHub Environments) are used because environment-scoped variables are unavailable for private repositories on GitHub Free.

## 9. Create the internal API key secret (before the first deploy of this change)

The deploy workflow mounts `INTERNAL_API_KEY` from Secret Manager (`INTERNAL_API_KEY=internal-api-key:latest`). The key lets the Vercel server skip the API's per-IP rate limit; it is a throttle bypass, not authentication. Create the secret and grant access **before** merging to `develop`, otherwise the new revision fails to start (the previous healthy revision keeps serving).

```bash
# Enable the Secret Manager API
gcloud services enable secretmanager.googleapis.com --project=<GCP_PROJECT_ID>

# Create the secret with a random 64-character hex value (the value is never printed or stored in a file)
openssl rand -hex 32 | gcloud secrets create internal-api-key \
  --data-file=- \
  --replication-policy=automatic \
  --project=<GCP_PROJECT_ID>

# Find the Cloud Run runtime service account (empty output = the Compute Engine default SA)
gcloud run services describe eco-metrics-api \
  --region=<GCP_REGION> \
  --format='value(spec.template.spec.serviceAccountName)' \
  --project=<GCP_PROJECT_ID>
# Fallback for a first deploy: <GCP_PROJECT_NUMBER>-compute@developer.gserviceaccount.com

# Let the runtime service account read the secret
gcloud secrets add-iam-policy-binding internal-api-key \
  --member="serviceAccount:<RUNTIME_SERVICE_ACCOUNT>" \
  --role="roles/secretmanager.secretAccessor" \
  --project=<GCP_PROJECT_ID>
```

The `github-deployer` service account needs no access to the secret value: the workflow only passes a reference (`internal-api-key:latest`) to Cloud Run. If a deploy fails with a Secret Manager permission error for the deployer, see [Troubleshooting](#deploy-fails-with-a-secret-manager-error).

## 10. Wait for IAM propagation

After creating the WIF provider and grants, wait **~5 minutes** before the first deploy. IAM changes are usually effective within a few minutes, but token exchanges can fail until propagation is complete.

## 11. Trigger the first deploy

Pick one:

- **Push to `develop` or merge to `main`.** The **CI** workflow runs first; the `Deploy API (development)` job (on `develop`) or `Deploy API (production)` job (on `main`) starts only if the CI job `Format, Lint, Typecheck, Build & Test` succeeds on that commit. Before building, the deploy reads the image that is currently serving on **that target's** service and diffs it against the commit being deployed (change detection, see [Optional change-detection verification](#15-optional-change-detection-verification)). When the service does not exist yet or its image tag is not a commit SHA, it always deploys — so the first push creates the service.
- **Manual run.** Go to **Actions → Deploy API → Run workflow**, pick the branch and the **target** (`development` or `production`). A manual run **skips the CI gate and change detection** and always deploys the dispatched ref. Use it for a first deploy, to force a redeploy (for example after rotating a secret) or to test edits to the deploy workflow from a branch (target `development`).
  - **`production` runs only from `main`.** Dispatching `production` from any other branch fails in the pre-flight step before touching GCP.

Watch the workflow build the image, push it to Artifact Registry, and deploy the Cloud Run service. Each target has its own concurrency group (`deploy-api-production`, `deploy-api-development`): a running deploy is never cancelled mid-rollout, at most one more run per target waits (a newer waiting run replaces an older one, which is safe because change detection diffs against the serving commit), and deploys of different targets run independently.

## 12. Record the Cloud Run URLs

After a successful deploy, the final step prints a URL like:

```
https://eco-metrics-api-abcdefghij-klm.<GCP_REGION>.run.app       # production
https://eco-metrics-api-dev-abcdefghij-klm.<GCP_REGION>.run.app   # development
```

Or read them at any time:

```bash
gcloud run services describe eco-metrics-api-dev --region=<GCP_REGION> --project=<GCP_PROJECT_ID> --format='value(status.url)'
```

Save both URLs. They are needed for the Vercel `API_BASE_URL` in the next steps.

## 13. Verify the deployed API

```bash
export RUN_URL=https://eco-metrics-api-abcdefghij-klm.<GCP_REGION>.run.app

# Health check (should return {"status":"ok"})
curl -s "$RUN_URL/api/v1/health"

# Product dataset (should return success:true with 60 products)
curl -s "$RUN_URL/api/v1/water-footprint/products" | head -c 300
```

## 14. Wire up Vercel

1. In the Vercel dashboard, open the project **Settings → Environment Variables**.
2. Set `API_BASE_URL` per environment (edit the existing variable and split it if it is shared):
   - **Production** → `https://<production-run-url>/api/v1` (`eco-metrics-api`)
   - **Preview** → `https://<dev-run-url>/api/v1` (`eco-metrics-api-dev`)
   - Any custom environment that deploys `develop` → the dev URL as well.
3. Redeploy the web app (or wait up to 24 h for ISR background revalidation).
4. Open `/water-footprint/` and confirm the product table renders.
5. To make Vercel production deployments wait for CI as well, follow [`docs/deploy/vercel.md`](./vercel.md) (Deployment Checks).

### `INTERNAL_API_KEY` in Vercel

1. Read the secret value locally (do not paste it anywhere else):

   ```bash
   gcloud secrets versions access latest --secret=internal-api-key --project=<GCP_PROJECT_ID>
   ```

2. In **Settings → Environment Variables**, add `INTERNAL_API_KEY` with that value for **Production**, **Preview** and any custom environment that deploys a branch (e.g. `develop`). Both Cloud Run services mount the same secret, so one value serves both. Leave **Development** unchecked: local development talks to the local API, and `vercel env pull` would otherwise copy the production key to disk. It is server-only: never prefix it with `NEXT_PUBLIC_` and never expose it to the browser.
3. Redeploy the web app so server-side fetches send `X-Internal-Api-Key` (the API then skips throttling for the Next.js server).

If the variable is missing on either side, nothing breaks: the API simply throttles the web server per client IP.

## 15. Optional change-detection verification

The `Detect api-affecting changes` step compares the commit being deployed with the commit of the image that is serving **on the target's own service** (the image tag is the commit SHA): production diffs against what `eco-metrics-api` runs, development against what `eco-metrics-api-dev` runs. It deploys when any file in the diff is one of `apps/api/**`, `packages/shared/**`, `Dockerfile`, `.dockerignore`, `.github/workflows/deploy-api.yml`, or a root build manifest (`package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `nx.json`, `tsconfig.base.json`, `tsconfig.json`). It logs the deployed SHA, the target SHA, the matched files and the decision, and repeats them in the job summary.

- Push a change that touches only `apps/web/**` → CI passes, the `Deploy API` job runs but skips build and deploy (the job summary says no API inputs changed), and Vercel builds as usual.
- Push a change that touches only `apps/api/**`, `packages/shared/**` or any other file listed above → CI passes, then the `Deploy API` job builds and deploys, and Vercel skips the build.
- Push a commit that fails CI → the deploy job is skipped (it does not run at all) and no new revision is created.
- Release commits on `main` (`[skip ci]`) never deploy by themselves. Because they touch `package.json`/`package-lock.json`, the next deploy of each target rebuilds even without API changes; this is expected.

## 16. Cost controls and free tier

Cloud Run request-based billing free tier (Tier 1 regions):

- **2 million requests/month**
- **180,000 vCPU-seconds/month**
- **360,000 GiB-seconds/month**

At this project's volume (hundreds of requests/month), the bill stays at **US$0**. Scale-to-zero (`--min-instances=0`) means no idle billing.

Recommended safeguards:

- Set a GCP billing alert (e.g. notify at US$1/month).
- Artifact Registry: the first 0.5 GB-month is free. Each image is ~100–120 MB compressed and both services push to the same `eco-metrics/api` package, so images accumulate twice as fast. Apply the versioned cleanup policy (keeps the 20 most recent images, deletes older ones after 90 days):

  ```bash
  # Preview what it would delete (no changes)
  gcloud artifacts repositories set-cleanup-policies eco-metrics \
    --policy=docs/deploy/artifact-registry-cleanup-policy.json \
    --location=<GCP_REGION> --project=<GCP_PROJECT_ID> --dry-run

  # Apply it
  gcloud artifacts repositories set-cleanup-policies eco-metrics \
    --policy=docs/deploy/artifact-registry-cleanup-policy.json \
    --location=<GCP_REGION> --project=<GCP_PROJECT_ID> --no-dry-run
  ```

  Keeping a count (not only an age) protects the production image while `main` lags `develop`, **but only up to 20 API images**: Cloud Run revisions reference their image, so if the image serving production falls outside the 20 most recent and is older than 90 days, the policy deletes it and the next cold start of production cannot pull it. Merge `develop` → `main` before that many API-affecting dev deploys accumulate, or raise `keepCount`. Twenty images can exceed 0.5 GB (cents per month); lower `keepCount` in the JSON for a strict US$0, at the cost of fewer rollback images.

- Both services scale to zero and share the always-free tier of the billing account.
- Cloud Logging: 30-day retention on the free tier, with 50 GB/month ingestion free.

## 17. Post-deploy follow-up (done)

The production Swagger server entry is already in place in `apps/api/src/main.ts`:

```typescript
.addServer('https://eco-metrics-api-fexi2yqv2q-uc.a.run.app', 'production (Cloud Run)')
```

It was task 10.1 of the original OpenSpec change and is cosmetic only (Swagger is disabled in production by `SWAGGER_ENABLED=false`).

## 18. Rate limiting, client IP and hop verification

- The API limits each client to **60 requests per 60 seconds**. The limit is **per Cloud Run instance and in-memory**: the effective per-client limit scales with the number of running instances and resets when an instance is recycled or scales to zero. This is accepted (abuse dampening, not a quota; the first-party consumer bypasses it).
- The client is identified by Express `req.ip`. The workflow sets `TRUST_PROXY_HOPS=1`, i.e. exactly one trusted proxy hop: the **rightmost** `X-Forwarded-For` entry (appended by Google's front end) is the client. Entries to its left are client-supplied and ignored.

### Post-deploy hop verification (manual)

```bash
export RUN_URL=https://eco-metrics-api-abcdefghij-klm.<GCP_REGION>.run.app

# Run from two different networks (e.g. home Wi-Fi and a phone hotspot) and compare the counters
curl -s -D - -o /dev/null -H 'X-Forwarded-For: 198.51.100.1' "$RUN_URL/api/v1/water-footprint/products" | grep -i x-ratelimit-remaining
```

Expected:

- Each real network has its **own** `X-RateLimit-Remaining` counter.
- Repeating the request from one network with a **different forged** leftmost `X-Forwarded-For` value does **not** reset that network's counter.
- Cloud Run request logs show the real client address in `httpRequest.remoteIp` / the last `X-Forwarded-For` entry.

If the counters are shared across networks (hops too low) or a forged header resets the counter (hops too high), change **only** the environment variable, with no code change:

```bash
gcloud run services update eco-metrics-api --update-env-vars TRUST_PROXY_HOPS=<n> --region=<GCP_REGION> --project=<GCP_PROJECT_ID>
```

and update the `TRUST_PROXY_HOPS` value in `.github/workflows/deploy-api.yml` so the next deploy keeps it.

## 19. Rotating `INTERNAL_API_KEY`

1. Add a new secret version: `openssl rand -hex 32 | gcloud secrets versions add internal-api-key --data-file=- --project=<GCP_PROJECT_ID>`.
2. Redeploy **both** services (Run workflow once per target, or `gcloud run services update <SERVICE> --region=<GCP_REGION> --project=<GCP_PROJECT_ID>` for `eco-metrics-api` and `eco-metrics-api-dev`): `latest` is resolved when a revision starts.
3. Update `INTERNAL_API_KEY` in Vercel (Production and Preview) and redeploy the web app.
4. Disable the old version: `gcloud secrets versions disable <OLD_VERSION> --secret=internal-api-key --project=<GCP_PROJECT_ID>`.

Between steps 2 and 3 the web server is throttled per IP like any other client; this is harmless.

## 20. Graceful shutdown

The API calls `app.enableShutdownHooks()`, so on `SIGTERM` (sent by Cloud Run before stopping an instance) Nest stops accepting connections, lets in-flight requests finish and then terminates (Nest re-raises the signal after closing, so the process ends by `SIGTERM`, status 143, within milliseconds when idle). The container runs `CMD ["node", "main.js"]` in exec form, so Node is PID 1 and receives the signal directly; an init process such as `tini` is not needed because the app spawns no child processes. Cloud Run's default 10 s grace period is unchanged.

## 21. Cutover to two services (one-time)

For a project that already runs the single `eco-metrics-api` service deployed from `develop`. Order matters: the push that carries the two-service workflow makes `develop` deploy to the dev service and stops `develop` from deploying production.

1. **GitHub — before pushing the change.** Add the repository variables `CORS_ORIGIN_DEV` (required) and `CORS_ORIGIN_PATTERN_DEV` (optional; move the current `CORS_ORIGIN_PATTERN` value here). Without `CORS_ORIGIN_DEV`, the development deploy fails in the pre-flight step (production is unaffected).
2. **Push the change to `develop`.** CI runs; `Deploy API (development)` finds no `eco-metrics-api-dev` service, deploys anyway and creates it. Production keeps serving the last image deployed from `develop`.
3. **Verify the dev service** with [§13](#13-verify-the-deployed-api) against its URL ([§12](#12-record-the-cloud-run-urls)).
4. **Vercel.** Point **Preview** `API_BASE_URL` at the dev URL ([§14](#14-wire-up-vercel)) and redeploy a preview to check the pages render.
5. **Merge `develop` → `main`.** CI on `main` runs `Deploy API (production)` for the first time from `main`.
6. **Trim production CORS** (optional). Previews no longer call production, so remove the `CORS_ORIGIN_PATTERN` variable and clear it on the service: `gcloud run services update eco-metrics-api --remove-env-vars CORS_ORIGIN_PATTERN --region=<GCP_REGION> --project=<GCP_PROJECT_ID>`. `http://localhost:3000` can also go from `CORS_ORIGIN` (local development uses the local API, or the dev service).
7. **Apply the Artifact Registry cleanup policy** ([§16](#16-cost-controls-and-free-tier)).

**Rollback:** revert the change; `develop` then deploys production again on the next push. Delete the dev service with `gcloud run services delete eco-metrics-api-dev --region=<GCP_REGION> --project=<GCP_PROJECT_ID>` and point Vercel Preview back at the production URL.

## Troubleshooting

> Commands below use `eco-metrics-api`; replace it with `eco-metrics-api-dev` when the problem is on the dev service.

### WIF authentication error

**Symptom:** the `Authenticate to Google Cloud` step fails with `Failed to generate Google Cloud access token` or a workload identity error.

**Fix:**

1. Double-check the GitHub variables for typos.
2. Confirm IAM propagation has completed (wait another 2–3 minutes).
3. Verify the attribute condition matches `maf248/eco-metrics-earth` exactly.
4. Re-run `gcloud iam service-accounts add-iam-policy-binding` from step 6.

### Image push denied

**Symptom:** `docker push` fails with `denied: Permission "artifactregistry.repositories.uploadArtifacts"`.

**Fix:** confirm the deployer SA has `roles/artifactregistry.writer` at the project level.

### Startup probe timeout

**Symptom:** the deploy step fails with a startup probe / health check error.

**Fix:** inspect the logs:

```bash
gcloud run services logs read eco-metrics-api --region=<GCP_REGION> --project=<GCP_PROJECT_ID>
```

Common causes: missing env var, bad image entrypoint, `PORT` not being read from the environment, or an invalid `CORS_ORIGIN`/`CORS_ORIGIN_PATTERN` value that fails Joi validation at boot. The validation error is printed to the logs before the process exits, and the startup probe never passes, so the previous healthy revision keeps serving traffic.

### Stale CORS_ORIGIN_PATTERN after unsetting the GitHub variable

**Symptom:** you removed or emptied the `CORS_ORIGIN_PATTERN` GitHub variable, but the Cloud Run service still allows origins matching the previous pattern.

**Fix:** `deploy-cloudrun` merges env vars by default, so a previously deployed value persists until it is explicitly cleared. Remove it from the service:

```bash
gcloud run services update eco-metrics-api --remove-env-vars CORS_ORIGIN_PATTERN --region=<GCP_REGION> --project=<GCP_PROJECT_ID>
```

### Cold-start first request

**Symptom:** the first request after idle is slow (~1–3 s).

**Fix:** this is expected behavior for scale-to-zero. The web app's ISR background revalidation absorbs it; end users do not wait on a cold start.

### Deploy fails with a Secret Manager error

**Symptom:** the deploy step fails, or the new revision never becomes ready, with a message such as `Permission denied on secret: projects/.../secrets/internal-api-key/versions/latest for Revision service account ...`.

**Fix:**

1. Confirm the secret exists: `gcloud secrets describe internal-api-key --project=<GCP_PROJECT_ID>`.
2. Grant `roles/secretmanager.secretAccessor` on it to the Cloud Run **runtime** service account (step 9).
3. If the error names the **deployer** (`github-deployer`), grant it `roles/secretmanager.viewer` on the secret as well: `gcloud secrets add-iam-policy-binding internal-api-key --member="serviceAccount:github-deployer@<GCP_PROJECT_ID>.iam.gserviceaccount.com" --role="roles/secretmanager.viewer" --project=<GCP_PROJECT_ID>`.
4. Re-run the workflow. The previous healthy revision keeps serving traffic in the meantime.

### The Deploy API job was skipped

**Symptom:** a push to `develop` (or `main`) shows `Deploy API (development)` (or `Deploy API (production)`) as skipped (grey) and no new revision exists.

**Fix:** the job `needs` the CI job, so it is skipped when `Format, Lint, Typecheck, Build & Test` failed or was cancelled (a newer push to the same ref supersedes a running CI). Fix CI and push again; the next successful run deploys every change since the serving revision. The job for the other branch is always skipped (a push to `develop` never runs the production job, and vice versa), and neither runs for other branches or pull requests.

### Production dispatch fails with "Production deploys only from main"

**Symptom:** a manual run with target `production` fails in `Resolve deploy target and pre-flight checks`.

**Fix:** expected when it was dispatched from a branch other than `main`. Dispatch from `main`, or use target `development` to test from a branch.

### API change on `develop` is not in production

**Symptom:** an API change is live on the dev service but not on production.

**Fix:** expected. Production deploys from `main`; open and merge the `develop` → `main` pull request. For an urgent redeploy of what is already on `main`, run **Actions → Deploy API → Run workflow** from `main` with target `production`.

### Deploy ran but nothing was built or deployed

**Symptom:** the `Deploy API` job is green but there is no new revision.

**Fix:** change detection found no API inputs in the diff between the serving commit and the pushed commit. Open the job summary (deployed SHA, target SHA, matched files, decision). To deploy anyway, run **Actions → Deploy API → Run workflow** (a manual run skips change detection).

### Deployed SHA unknown after a force-push

**Symptom:** the detection log says the deployed SHA is not in the repository history.

**Fix:** none needed. `develop` may be force-pushed, so the serving commit can disappear from history; in that case, as in any case where the serving image cannot be read or its tag is not a commit SHA, the workflow deploys. Skipping is never the fallback.

### `vars` are empty in the called workflow

**Symptom:** the `Pre-flight checks` step of an automatic run fails with `Missing required GitHub variables`, while a manual run works.

**Fix:** repository variables are expected to be available to a reusable workflow called from the same repository. If they are not, pass the required values and the CORS variables as `workflow_call` inputs from the `deploy-api-*` jobs in `ci.yml` (`${{ vars.X }}`) and read them from `inputs` in `deploy-api.yml`.
