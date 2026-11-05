# Deploy `apps/api` on Google Cloud Run

This runbook configures the GCP project, GitHub Actions OIDC authentication, Artifact Registry, and two Cloud Run services so that the NestJS BFF is built and deployed automatically **after CI passes** (each deploy job `needs` the CI job and the `Build API image (no push)` job; a red or cancelled run of either never deploys):

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

The deploy workflow mounts `INTERNAL_API_KEY` from Secret Manager (`INTERNAL_API_KEY=internal-api-key:latest`). Every request except `GET /api/v1/health` must send it in `X-Internal-Api-Key` (otherwise `401`), and the API refuses to start in production without it. A valid key also selects the generous rate-limit tier. Create the secret and grant access **before** merging to `develop`, otherwise the new revision fails to start (the previous healthy revision keeps serving).

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
export RUN_URL=<service-url>   # https://<service>-<hash>-<region-code>.a.run.app
export INTERNAL_API_KEY=<value of the internal-api-key secret>

# Health check, no key needed (should return {"status":"ok"})
curl -s "$RUN_URL/api/v1/health"

# Any other route without the key must answer 401
curl -s -o /dev/null -w '%{http_code}\n' "$RUN_URL/api/v1/water-footprint/products"

# Product dataset with the key (should return success:true with 60 products)
curl -s -H "X-Internal-Api-Key: $INTERNAL_API_KEY" "$RUN_URL/api/v1/water-footprint/products" | head -c 300
```

## 14. Wire up Vercel

1. In the Vercel dashboard, open the project **Settings → Environment Variables**.
2. Set `API_BASE_URL` per environment (edit the existing variable and split it if it is shared):
   - **Production** → `https://<production-run-url>/api/v1` (`eco-metrics-api`)
   - **Preview** → `https://<dev-run-url>/api/v1` (`eco-metrics-api-dev`)
   - Any custom environment that deploys `develop` → the dev URL as well.
3. Redeploy the web app: environment variables apply only to new deployments.
4. Open `/water-footprint/` and confirm the product table renders.
5. To make Vercel production deployments wait for CI as well, follow [`docs/deploy/vercel.md`](./vercel.md) (Deployment Checks).

### `INTERNAL_API_KEY` in Vercel

1. Read the secret value locally (do not paste it anywhere else):

   ```bash
   gcloud secrets versions access latest --secret=internal-api-key --project=<GCP_PROJECT_ID>
   ```

2. In **Settings → Environment Variables**, add `INTERNAL_API_KEY` with that value for **Production**, **Preview** and any custom environment that deploys a branch (e.g. `develop`). Both Cloud Run services mount the same secret, so one value serves both. Leave **Development** unchecked: local development talks to the local API, and `vercel env pull` would otherwise copy the production key to disk. It is server-only: never prefix it with `NEXT_PUBLIC_` and never expose it to the browser.
3. Redeploy the web app so server-side fetches send `X-Internal-Api-Key` (the API requires it and applies the keyed rate-limit tier to the Next.js server).

If the variable is missing in Vercel, the web server's fetches get `401` and pages fall back to their cached or unavailable state. In production the API does not start without the secret.

## 15. Optional change-detection verification

The `Detect api-affecting changes` step compares the commit being deployed with the commit of the image that is serving **on the target's own service** (the image tag is the commit SHA): production diffs against what `eco-metrics-api` runs, development against what `eco-metrics-api-dev` runs. The path list is read from `scripts/api-image-inputs.pattern`, shared with the CI image build check (`Build API image (no push)`). It deploys when any file in the diff is one of `apps/api/**`, `packages/shared/**`, `Dockerfile`, `.dockerignore`, `.github/workflows/deploy-api.yml`, or a root build manifest (`package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `nx.json`, `tsconfig.base.json`, `tsconfig.json`). It logs the deployed SHA, the target SHA, the matched files and the decision, and repeats them in the job summary.

- Push a change that touches only `apps/web/**` → CI passes, the `Deploy API` job runs but skips build and deploy (the job summary says no API inputs changed), and Vercel builds as usual.
- Push a change that touches only `apps/api/**`, `packages/shared/**` or any other file listed above → CI passes, then the `Deploy API` job builds and deploys, and Vercel skips the build.
- Push a commit that fails CI → the deploy job is skipped (it does not run at all) and no new revision is created.
- Edits to `.github/workflows/ci.yml`, `scripts/api-image-inputs.pattern` or `scripts/detect-api-image-changes.sh` run the CI image build but do not deploy: they do not change the image.
- Release commits on `main` (`[skip ci]`) never deploy by themselves. Because they touch `package.json`/`package-lock.json`, the next deploy of each target rebuilds even without API changes; this is expected.

## 16. Cost controls and free tier

Cloud Run request-based billing free tier (Tier 1 regions):

- **2 million requests/month**
- **180,000 vCPU-seconds/month**
- **360,000 GiB-seconds/month**

At this project's volume (hundreds of requests/month), the bill stays at **US$0**. Scale-to-zero (`--min-instances=0`) means no idle billing, and `--max-instances` (`2` for `eco-metrics-api`, `1` for `eco-metrics-api-dev`, set per target in `deploy-api.yml`) bounds the burn rate: excess load degrades to `429`/`503` instead of scaling. It does not bound a monthly total.

Recommended safeguards:

- Set a GCP billing alert (e.g. notify at US$1/month); the exact commands, together with the provider snapshot bucket that this project also keeps inside the Cloud Storage free tier, are in [§22](#22-provider-snapshot-bucket-one-time-before-the-first-push-that-enables-it).
- Artifact Registry: the first 0.5 GB-month is free. Each environment publishes to its own package (`eco-metrics/api-production` and `eco-metrics/api-development`, tagged with the commit SHA). Images share layers, so each one adds ~15 MB on average. The versioned cleanup policy keeps the **3 most recent images of each package** (the serving image plus two rollback candidates) and deletes any other image of those packages once it is older than 1 day. Development deploys can never delete a production image, and storage stays around 200–350 MB.

  **One-time setup** (from a repository that still has the legacy shared `api` package):
  1. Deploy both environments with the per-environment workflow: push to `develop`, then merge to `main`. Both deploys rebuild, because the workflow file changed.
  2. Check that both services serve an image from the new packages (deleting the legacy package earlier would break production cold starts):

     ```bash
     for s in eco-metrics-api eco-metrics-api-dev; do
       gcloud run services describe "$s" --region=<GCP_REGION> --project=<GCP_PROJECT_ID> \
         --format='value(spec.template.spec.containers[0].image)'
     done
     # Expect .../eco-metrics/api-production:<sha> and .../eco-metrics/api-development:<sha>
     ```

  3. Apply the policy. It only matches the two environment packages. `gcloud` validates the file when you run the command; if it rejects it, the repository is left unchanged. Optionally, apply it first with `--dry-run`: the policy is evaluated in its regular (roughly daily) run without deleting anything, and the would-be deletions are recorded in the repository's audit logs.

     ```bash
     gcloud artifacts repositories set-cleanup-policies eco-metrics \
       --policy=docs/deploy/artifact-registry-cleanup-policy.json \
       --location=<GCP_REGION> --project=<GCP_PROJECT_ID> --no-dry-run
     ```

  4. Delete the legacy package, which the policy does not manage:

     ```bash
     gcloud artifacts packages delete api --repository=eco-metrics \
       --location=<GCP_REGION> --project=<GCP_PROJECT_ID>
     ```

  5. A day later, check the size: `gcloud artifacts repositories describe eco-metrics --location=<GCP_REGION> --project=<GCP_PROJECT_ID>` prints `Repository Size: …` (it should stay below 0.5 GB).

  Rolling back further than the two previous images per environment means reverting in git and redeploying. After step 4, Cloud Run revisions created before the migration point at the deleted `api` package and can no longer start, so traffic rollback only works to revisions deployed from the new packages.

- Both services scale to zero and share the always-free tier of the billing account.
- Cloud Logging: 30-day retention on the free tier, with 50 GB/month ingestion free.

## 17. Post-deploy follow-up (done)

`apps/api/src/main.ts` registers only the local Swagger server. The production URL is deliberately not hard-coded in any tracked file (Swagger is disabled in production by `SWAGGER_ENABLED=false`).

## 18. Rate limiting, client IP and hop verification

- The API limits each client in two tiers: **300 requests per 60 seconds** with a valid `X-Internal-Api-Key` and **30 per 60 seconds** without (those get `401`, then `429`). The limits are **per Cloud Run instance and in-memory**: the effective per-client limit scales with the number of running instances (capped at 2 in production) and resets when an instance is recycled or scales to zero. This is accepted (abuse dampening, not a quota).
- The client is identified by Express `req.ip`. The workflow sets `TRUST_PROXY_HOPS=1`, i.e. exactly one trusted proxy hop: the **rightmost** `X-Forwarded-For` entry (appended by Google's front end) is the client. Entries to its left are client-supplied and ignored.

### Post-deploy hop verification (manual)

```bash
export RUN_URL=<service-url>   # https://<service>-<hash>-<region-code>.a.run.app
export INTERNAL_API_KEY=<value of the internal-api-key secret>

# Run from two different networks (e.g. home Wi-Fi and a phone hotspot) and compare the counters
curl -s -D - -o /dev/null -H "X-Internal-Api-Key: $INTERNAL_API_KEY" -H 'X-Forwarded-For: 198.51.100.1' "$RUN_URL/api/v1/water-footprint/products" | grep -i x-ratelimit-remaining
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

Between steps 2 and 3 the web server's requests get `401` (the old key no longer matches); pages keep serving from the web cache. Keep the window short.

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
7. **Set up Artifact Registry retention** following the full one-time sequence in [§16](#16-cost-controls-and-free-tier): verify both services serve the per-environment packages, apply the policy, then delete the legacy `api` package.

**Rollback:** revert the change; `develop` then deploys production again on the next push. Delete the dev service with `gcloud run services delete eco-metrics-api-dev --region=<GCP_REGION> --project=<GCP_PROJECT_ID>` and point Vercel Preview back at the production URL.

## 22. Provider snapshot bucket (one-time, before the first push that enables it)

When OWID is unreachable the API serves the last good payload of each OWID-backed category (`meta.stale: true`) instead of a `502`. The payloads live in one Cloud Storage bucket, one object per category per environment: `production/<category>.json` and `development/<category>.json`. The feature is opt-in: with the `SNAPSHOT_BUCKET` repository variable unset, nothing is deployed with persistence and the API behaves as before. Run this section **before the first push to `develop`** that should use it; the code is safe in any order, because an unset, missing or inaccessible bucket only disables persistence.

> **Region.** Create the bucket in `us-central1`, the same region as the Cloud Run services (§8, `GCP_REGION`). Same-region traffic between Cloud Run and the bucket is free; another region breaks the free-tier numbers below.

```bash
# 1. Create the bucket (the name is global: pick a unique one, e.g. <GCP_PROJECT_ID>-snapshots)
gcloud storage buckets create gs://<SNAPSHOT_BUCKET> \
  --location=us-central1 \
  --default-storage-class=STANDARD \
  --uniform-bucket-level-access \
  --public-access-prevention \
  --soft-delete-duration=0 \
  --project=<GCP_PROJECT_ID>

# 2. Find the Cloud Run runtime service account (same command as §9; empty output = the
#    Compute Engine default SA, <GCP_PROJECT_NUMBER>-compute@developer.gserviceaccount.com)
gcloud run services describe eco-metrics-api \
  --region=<GCP_REGION> \
  --format='value(spec.template.spec.serviceAccountName)' \
  --project=<GCP_PROJECT_ID>

# 3. Let the runtime service account manage objects in this bucket only (not the project).
#    Repeat steps 2 and 3 for eco-metrics-api-dev if it runs under a different account.
gcloud storage buckets add-iam-policy-binding gs://<SNAPSHOT_BUCKET> \
  --member="serviceAccount:<RUNTIME_SERVICE_ACCOUNT>" \
  --role="roles/storage.objectAdmin"
```

Why these flags: Standard class is the one covered by the Always Free tier; uniform bucket-level access plus enforced public access prevention keep the bucket private and IAM-only; `--soft-delete-duration=0` disables soft delete (it defaults to 7 days) so an overwrite leaves no billed copy behind; object versioning stays off (its default). `roles/storage.objectAdmin` is needed because overwriting an object requires create and delete; the scope is the single bucket. Credentials are Application Default Credentials of the runtime service account: no key file and no secret exist.

Then set the repository variable (Settings → Secrets and variables → Actions → Variables, as in §8): `SNAPSHOT_BUCKET` = `<SNAPSHOT_BUCKET>`. The deploy then passes `SNAPSHOT_BUCKET=<value>` and `SNAPSHOT_PREFIX=production|development` to each service (the prefix is the deploy target).

**Free tier** (Cloud Storage Always Free, Standard class in `us-central1`): 5 GB-months of storage, 5,000 Class A operations (writes) and 50,000 Class B operations (reads, metadata) per month. The API writes each object at most about once a day (when its content changed or it is older than 24 h) and issues one metadata read per category per cold start: roughly 180 writes and a few thousand metadata reads per month for three categories in two environments, with a few MB stored.

**Budget alert (US$1).** A safety net, created once from Cloud Shell:

```bash
gcloud services enable billingbudgets.googleapis.com --project=<GCP_PROJECT_ID>

# Find the billing account ID (format 000000-AAAAAA-BBBBBB)
gcloud billing accounts list

gcloud billing budgets create \
  --billing-account=<BILLING_ACCOUNT_ID> \
  --display-name="eco-metrics-earth monthly US$1" \
  --budget-amount=1USD \
  --filter-projects=projects/<GCP_PROJECT_ID> \
  --threshold-rule=percent=0.10 \
  --threshold-rule=percent=0.50 \
  --threshold-rule=percent=1.00
```

`--public-access-prevention` is a boolean flag (no value; it sets prevention to "enforced") and `--soft-delete-duration=0` disables soft delete.

By default the alerts go by email to the billing account administrators. A budget alert **only notifies**: it never stops spending or disables a service, and cost data lags by several hours, so an alert arrives after the spending happened. The currency in `--budget-amount` must match the billing account's currency (omit the `USD` suffix to use the account's own). To see usage: **Billing → Reports**, filtered by the Cloud Storage service, and the bucket's **Observability** tab in the console for request counts by operation.

**Verification and rollout order:**

1. Run the commands above and set the `SNAPSHOT_BUCKET` variable.
2. Push to `develop`; wait for `Deploy API (development)`.
3. Call each endpoint once on the dev service: `curl -s <DEV_API_URL>/api/v1/co2-emissions -H "X-Internal-Api-Key: $INTERNAL_API_KEY" >/dev/null`, then `global-temperature` and `energy-sources` (each with the same header).
4. Check the objects: `gcloud storage ls gs://<SNAPSHOT_BUCKET>/development/` should list `co2-emissions.json`, `energy-sources.json` and `global-temperature.json`.
5. Open the `develop` → `main` pull request. Production creates `production/*.json` on its first requests.

Deploy the API before the web for every payload change (the web guards the payload shape). A contract change of a category payload should be followed by deleting its object (`gcloud storage rm gs://<SNAPSHOT_BUCKET>/<prefix>/<category>.json`), because a stored snapshot keeps the old shape until the next successful fetch overwrites it.

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

### Snapshot persistence stays on after unsetting the GitHub variable

**Symptom:** you removed or emptied the `SNAPSHOT_BUCKET` repository variable, but the service still reads and writes the bucket.

**Fix:** `deploy-cloudrun` merges env vars, so the values of a previous deploy persist until they are cleared. Remove both from the service (they are optional, so the API boots without them and persistence is disabled):

```bash
gcloud run services update eco-metrics-api --remove-env-vars SNAPSHOT_BUCKET,SNAPSHOT_PREFIX --region=<GCP_REGION> --project=<GCP_PROJECT_ID>
```

Use `eco-metrics-api-dev` for the development service. Removing only `SNAPSHOT_PREFIX` would make the next boot fail fast (a bucket without a prefix is invalid).

### Cold-start first request

**Symptom:** the first request after idle is slow: about 6–7 s (measured on 2026-10-09).

**Fix:** this is expected behavior for scale-to-zero, and the web app absorbs it:

- `getWaterFootprintProducts()` makes 2 attempts of 10 s each. The first one wakes the instance and the second one finds it ready.
- If both fail, it logs `Water footprint fetch failed after 2 attempts` and throws. During an ISR revalidation, visitors keep receiving the last good page (`x-nextjs-cache: STALE`) and the page regenerates on a later request once the API answers. A failed fetch is never cached.
- `/water-footprint/` is not pre-rendered at build time: it is generated on its first request after each deploy, so that one request may wait for the cold start. If the API is down at that moment, the visitor sees the error page and the next request tries again.

End users only wait on a cold start for that first request after a deploy.

### Deploy fails with a Secret Manager error

**Symptom:** the deploy step fails, or the new revision never becomes ready, with a message such as `Permission denied on secret: projects/.../secrets/internal-api-key/versions/latest for Revision service account ...`.

**Fix:**

1. Confirm the secret exists: `gcloud secrets describe internal-api-key --project=<GCP_PROJECT_ID>`.
2. Grant `roles/secretmanager.secretAccessor` on it to the Cloud Run **runtime** service account (step 9).
3. If the error names the **deployer** (`github-deployer`), grant it `roles/secretmanager.viewer` on the secret as well: `gcloud secrets add-iam-policy-binding internal-api-key --member="serviceAccount:github-deployer@<GCP_PROJECT_ID>.iam.gserviceaccount.com" --role="roles/secretmanager.viewer" --project=<GCP_PROJECT_ID>`.
4. Re-run the workflow. The previous healthy revision keeps serving traffic in the meantime.

### The Deploy API job was skipped

**Symptom:** a push to `develop` (or `main`) shows `Deploy API (development)` (or `Deploy API (production)`) as skipped (grey) and no new revision exists.

**Fix:** the job `needs` both CI jobs, so it is skipped when `Format, Lint, Typecheck, Build & Test` or `Build API image (no push)` failed or was cancelled (a newer push to the same ref supersedes a running CI). The image job's step summary (`API image change detection`) shows whether it built and why. Fix CI and push again; the next successful run deploys every change since the serving revision. The job for the other branch is always skipped (a push to `develop` never runs the production job, and vice versa), and neither runs for other branches or pull requests.

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
