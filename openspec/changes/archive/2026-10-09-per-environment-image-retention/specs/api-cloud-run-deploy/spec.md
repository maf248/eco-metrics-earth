## MODIFIED Requirements

### Requirement: Images are published to Artifact Registry with immutable SHA tags

The workflow SHALL build the image as `<GCP_REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/eco-metrics/<package>:<commit-sha>` and push it to the `eco-metrics` Artifact Registry Docker repository, where `<package>` is resolved from the deploy target in the same step that resolves the service: `api-production` for `production` and `api-development` for `development`. Each environment therefore has its own image history. It SHALL NOT use mutable tags (no `:latest`) — each deploy references the exact commit SHA; rollbacks use Cloud Run revision traffic or redeploying an older SHA tag.

#### Scenario: Push denied without artifactregistry.writer

- **GIVEN** the deployer service account lacks `roles/artifactregistry.writer`
- **WHEN** the image push step runs
- **THEN** the push fails with a permissions error and the workflow stops before deploying

#### Scenario: Every deploy is traceable to a commit

- **WHEN** a deploy completes
- **THEN** the deployed image tag equals the triggering commit's SHA (visible in the workflow run and in Cloud Run's revision details)

#### Scenario: Each target publishes to its own package

- **WHEN** the workflow deploys target `production` (or `development`) for commit `<sha>`
- **THEN** it pushes and deploys `.../eco-metrics/api-production:<sha>` (or `.../eco-metrics/api-development:<sha>`)
- **AND** change detection still reads the deployed commit from the tag of the image the service serves

### Requirement: Artifact Registry image retention is bounded by a versioned cleanup policy

The repository SHALL version an Artifact Registry cleanup policy file at `docs/deploy/artifact-registry-cleanup-policy.json`, in the format accepted by `gcloud artifacts repositories set-cleanup-policies --policy=<file>`. The policy SHALL keep the **3 most recent versions of each environment package** (`api-production` and `api-development`, one keep rule per package) and SHALL delete any other version of those two packages once it is older than 1 day. It SHALL NOT match any other package. The runbook SHALL document how to preview the policy (`--dry-run`), apply it to the `eco-metrics` repository, and remove the legacy shared `api` package once both services serve images from the per-environment packages. Applying the policy and removing the legacy package are user-executed steps; the deploy workflow SHALL NOT delete images.

#### Scenario: Policy file is valid for gcloud

- **WHEN** the user runs `gcloud artifacts repositories set-cleanup-policies eco-metrics --policy=docs/deploy/artifact-registry-cleanup-policy.json --dry-run` with the runbook's location and project flags
- **THEN** the command accepts the file

#### Scenario: Recent images are never deleted

- **GIVEN** an image version among the 3 most recent versions of its package
- **WHEN** the cleanup policy runs
- **THEN** the version is kept even if it is older than the delete condition's age

#### Scenario: Development churn never deletes production images

- **GIVEN** many development deploys and no production deploy for weeks
- **WHEN** the cleanup policy runs
- **THEN** only `api-development` versions beyond its 3 most recent are deleted
- **AND** the 3 most recent `api-production` versions, including the one serving production, are kept

#### Scenario: Storage stays within the free tier

- **GIVEN** the policy applied and the legacy `api` package removed
- **WHEN** the repository size is checked after the policy has run
- **THEN** it holds at most 3 versions per environment package (plus versions younger than 1 day) and stays below 0.5 GB
