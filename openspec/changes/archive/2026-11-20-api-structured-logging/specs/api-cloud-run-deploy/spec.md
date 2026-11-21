## MODIFIED Requirements

### Requirement: Deploy configures proxy hops and mounts the internal key from Secret Manager

The deploy workflow SHALL pass `TRUST_PROXY_HOPS=1` in the `env_vars` of the `deploy-cloudrun` step (Cloud Run's documented single front-end hop without an external load balancer). It SHALL also pass `GCP_PROJECT_ID=${{ vars.GCP_PROJECT_ID }}` there, so that the API can build the `logging.googleapis.com/trace` field that correlates its log lines with Cloud Run's request logs (the project id is not a secret and Cloud Run does not inject it as an env var). It SHALL provide `INTERNAL_API_KEY` to the service through the action's `secrets:` input referencing a Secret Manager secret (`INTERNAL_API_KEY=internal-api-key:latest`), never through `env_vars` or a GitHub variable/secret value. The pre-flight step SHALL NOT require any new GitHub variable (`GCP_PROJECT_ID` is already required). The Cloud Run runtime service account SHALL hold `roles/secretmanager.secretAccessor` on that secret (manual, documented). If the secret or the grant is missing, the revision SHALL fail to deploy (startup failure), keeping the previous healthy revision serving.

#### Scenario: Hop count is set on the service

- **WHEN** the workflow runs and the service configuration is inspected
- **THEN** the service env contains `TRUST_PROXY_HOPS=1`

#### Scenario: Project id is set on the service for log correlation

- **WHEN** the workflow runs and the service configuration is inspected
- **THEN** the service env contains `GCP_PROJECT_ID` equal to the `GCP_PROJECT_ID` repository variable
- **AND** the pre-flight step requires no variable that it did not require before

#### Scenario: Internal key is mounted from Secret Manager, not stored in the repo

- **WHEN** the workflow file and the deployed service configuration are reviewed
- **THEN** `INTERNAL_API_KEY` appears as a secret reference (`secretKeyRef`) on the service, and no literal key value exists in the repo, workflow, or GitHub variables

#### Scenario: Missing secret grant fails the deploy safely

- **GIVEN** the runtime service account lacks `secretmanager.secretAccessor` on the secret
- **WHEN** the deploy runs
- **THEN** the new revision does not become ready and the previous revision keeps serving traffic
