# Deploy `apps/api` on Google Cloud Run

This runbook configures the GCP project, GitHub Actions OIDC authentication, Artifact Registry, and Cloud Run service so that pushes to `develop` automatically build and deploy the NestJS BFF.

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

| Variable              | Value / example                                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GCP_PROJECT_ID`      | `<GCP_PROJECT_ID>`                                                                                                                                 |
| `GCP_REGION`          | `us-central1` (or another Tier 1 region for the free-tier numbers above)                                                                           |
| `WIF_PROVIDER`        | `projects/<GCP_PROJECT_NUMBER>/locations/global/workloadIdentityPools/...`                                                                         |
| `WIF_SERVICE_ACCOUNT` | `github-deployer@<GCP_PROJECT_ID>.iam.gserviceaccount.com`                                                                                         |
| `CORS_ORIGIN`         | Comma-separated list of exact origins, e.g. `https://eco-metrics-earth.vercel.app` or `http://localhost:3000,https://eco-metrics-earth.vercel.app` |
| `CORS_ORIGIN_PATTERN` | Optional anchored regex for Vercel previews, e.g. `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$` — leave empty/unset by default             |

> The workflow escapes commas and backslashes in these values automatically before passing them to `deploy-cloudrun`, so store the raw value in the GitHub variable (no manual escaping).

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

1. Merge this change into `develop` (after the mandatory user-approval checkpoint).
2. Go to **Actions → Deploy API → Run workflow** and trigger a `workflow_dispatch` run against `develop`.
3. Watch the workflow build the image, push it to Artifact Registry, and deploy the Cloud Run service.

## 12. Record the Cloud Run URL

After a successful deploy, the final step prints a URL like:

```
https://eco-metrics-api-abcdefghij-klm.<GCP_REGION>.run.app
```

Save this URL. It is needed for the Vercel `API_BASE_URL` in the next step.

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
2. Set `API_BASE_URL` to `https://<run-url>/api/v1` for both **Production** and **Preview**.
3. Redeploy the web app (or wait up to 24 h for ISR background revalidation).
4. Open `/water-footprint/` and confirm the product table renders.

### `INTERNAL_API_KEY` in Vercel

1. Read the secret value locally (do not paste it anywhere else):

   ```bash
   gcloud secrets versions access latest --secret=internal-api-key --project=<GCP_PROJECT_ID>
   ```

2. In **Settings → Environment Variables**, add `INTERNAL_API_KEY` with that value for **Production**, **Preview** and any custom environment that deploys a branch (e.g. `develop`). Leave **Development** unchecked: local development talks to the local API, and `vercel env pull` would otherwise copy the production key to disk. It is server-only: never prefix it with `NEXT_PUBLIC_` and never expose it to the browser.
3. Redeploy the web app so server-side fetches send `X-Internal-Api-Key` (the API then skips throttling for the Next.js server).

If the variable is missing on either side, nothing breaks: the API simply throttles the web server per client IP.

## 15. Optional path-filter verification pushes

- Push a change that touches only `apps/web/**` → the **Deploy API** workflow should **not** run, and Vercel should build as usual.
- Push a change that touches only `apps/api/**`, `packages/shared/**`, `Dockerfile`, `.dockerignore`, `.github/workflows/deploy-api.yml`, or any root build manifest (`package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `nx.json`, `tsconfig.base.json`, `tsconfig.json`) → the **Deploy API** workflow should run, and Vercel should skip the build.

## 16. Cost controls and free tier

Cloud Run request-based billing free tier (Tier 1 regions):

- **2 million requests/month**
- **180,000 vCPU-seconds/month**
- **360,000 GiB-seconds/month**

At this project's volume (hundreds of requests/month), the bill stays at **US$0**. Scale-to-zero (`--min-instances=0`) means no idle billing.

Recommended safeguards:

- Set a GCP billing alert (e.g. notify at US$1/month).
- Artifact Registry: the first 0.5 GB-month is free. Each image is ~100–120 MB compressed, so several SHA tags fit. Add an occasional cleanup policy or manual cleanup to keep storage trivial.
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
2. Redeploy the API (Run workflow, or `gcloud run services update eco-metrics-api --region=<GCP_REGION> --project=<GCP_PROJECT_ID>`): `latest` is resolved when a revision starts.
3. Update `INTERNAL_API_KEY` in Vercel (Production and Preview) and redeploy the web app.
4. Disable the old version: `gcloud secrets versions disable <OLD_VERSION> --secret=internal-api-key --project=<GCP_PROJECT_ID>`.

Between steps 2 and 3 the web server is throttled per IP like any other client; this is harmless.

## 20. Graceful shutdown

The API calls `app.enableShutdownHooks()`, so on `SIGTERM` (sent by Cloud Run before stopping an instance) Nest stops accepting connections, lets in-flight requests finish and then terminates (Nest re-raises the signal after closing, so the process ends by `SIGTERM`, status 143, within milliseconds when idle). The container runs `CMD ["node", "main.js"]` in exec form, so Node is PID 1 and receives the signal directly; an init process such as `tini` is not needed because the app spawns no child processes. Cloud Run's default 10 s grace period is unchanged.

## Troubleshooting

### WIF authentication error

**Symptom:** the `Authenticate to Google Cloud` step fails with `Failed to generate Google Cloud access token` or a workload identity error.

**Fix:**

1. Double-check the five GitHub variables for typos.
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
