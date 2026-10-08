## ADDED Requirements

### Requirement: Deploy configures proxy hops and mounts the internal key from Secret Manager

The deploy workflow SHALL pass `TRUST_PROXY_HOPS=1` in the `env_vars` of the `deploy-cloudrun` step (Cloud Run's documented single front-end hop without an external load balancer). It SHALL provide `INTERNAL_API_KEY` to the service through the action's `secrets:` input referencing a Secret Manager secret (`INTERNAL_API_KEY=internal-api-key:latest`), never through `env_vars` or a GitHub variable/secret value. The pre-flight step SHALL NOT require any new GitHub variable. The Cloud Run runtime service account SHALL hold `roles/secretmanager.secretAccessor` on that secret (manual, documented). If the secret or the grant is missing, the revision SHALL fail to deploy (startup failure), keeping the previous healthy revision serving.

#### Scenario: Hop count is set on the service

- **WHEN** the workflow runs and the service configuration is inspected
- **THEN** the service env contains `TRUST_PROXY_HOPS=1`

#### Scenario: Internal key is mounted from Secret Manager, not stored in the repo

- **WHEN** the workflow file and the deployed service configuration are reviewed
- **THEN** `INTERNAL_API_KEY` appears as a secret reference (`secretKeyRef`) on the service, and no literal key value exists in the repo, workflow, or GitHub variables

#### Scenario: Missing secret grant fails the deploy safely

- **GIVEN** the runtime service account lacks `secretmanager.secretAccessor` on the secret
- **WHEN** the deploy runs
- **THEN** the new revision does not become ready and the previous revision keeps serving traffic

### Requirement: Runbook documents the manual secret setup and hop verification

`docs/deploy/cloud-run.md` SHALL document, with exact commands: creating the secret (`openssl rand -hex 32` piped to `gcloud secrets create internal-api-key --data-file=-`), granting `roles/secretmanager.secretAccessor` to the Cloud Run runtime service account, enabling `secretmanager.googleapis.com`, setting the same value as the server-only `INTERNAL_API_KEY` in Vercel (Production and Preview), key rotation (add new version, redeploy, update Vercel, disable old version), the per-instance limit caveat, and the post-deploy hop verification. The deployer service account needs no secret access unless the runbook states otherwise.

#### Scenario: Post-deploy hop verification

- **GIVEN** the API deployed with `TRUST_PROXY_HOPS=1`
- **WHEN** the user sends `curl -H 'X-Forwarded-For: 198.51.100.1' <run-url>/api/v1/water-footprint/products` repeatedly from two different networks and inspects Cloud Run logs / `X-RateLimit-Remaining`
- **THEN** each real network has its own counter, and a forged leftmost `X-Forwarded-For` value does not reset the counter
- **AND** if the observed client IP is wrong, only the `TRUST_PROXY_HOPS` env var is changed and redeployed (no code change)

#### Scenario: Vercel traffic is not throttled

- **GIVEN** `INTERNAL_API_KEY` set identically in Secret Manager and Vercel
- **WHEN** the web app revalidates a category page
- **THEN** the API receives `X-Internal-Api-Key` and the fetch succeeds regardless of the per-IP counters
