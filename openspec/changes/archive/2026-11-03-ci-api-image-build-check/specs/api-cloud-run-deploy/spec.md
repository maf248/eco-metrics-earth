## ADDED Requirements

### Requirement: Image-input path list has a single source of truth

The list of paths that are inputs of the API image SHALL live only in `scripts/api-image-inputs.pattern` (one extended regular expression, one line). The `Detect api-affecting changes` step of `.github/workflows/deploy-api.yml` SHALL read its pattern from that file instead of an inline literal, and the decisions it makes SHALL be identical to those made with the previous inline expression. The expression SHALL match exactly: `apps/api/` and `packages/shared/` prefixes; the root files `Dockerfile`, `.dockerignore`, `package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `nx.json`, `tsconfig.base.json`, `tsconfig.json`; and `.github/workflows/deploy-api.yml`. It SHALL NOT include `.github/workflows/ci.yml` or other files that do not change the deployed image.

#### Scenario: Deploy detection reads the shared file

- **WHEN** `.github/workflows/deploy-api.yml` is read
- **THEN** the detection step obtains its pattern from `scripts/api-image-inputs.pattern`
- **AND** no second copy of the path list exists in the workflow

#### Scenario: Deploy decisions are unchanged

- **GIVEN** a diff between the serving SHA and the target SHA
- **WHEN** change detection runs with the pattern read from the file
- **THEN** it decides `deploy=true` for exactly the paths listed above and `deploy=false` otherwise, as before

#### Scenario: CI-only edits do not deploy

- **GIVEN** a diff that touches only `.github/workflows/ci.yml`, `scripts/api-image-inputs.pattern` or `scripts/detect-api-image-changes.sh`
- **WHEN** deploy change detection runs
- **THEN** it decides `deploy=false` (the CI image-build check, not the deploy, validates those edits)

### Requirement: Automatic API deploys also wait for the image build check

`deploy-api-production` and `deploy-api-development` in `.github/workflows/ci.yml` SHALL declare `needs: [ci, api-image]`. Their `if` conditions, permissions and `with.target` SHALL remain unchanged. If the `api-image` job fails or is cancelled, neither deploy job SHALL run. If `api-image` concludes `success` (including when its build steps were skipped because no input changed), the deploy jobs SHALL proceed as before.

#### Scenario: Failed image build blocks the deploy

- **GIVEN** a push to `develop` whose `api-image` job fails
- **WHEN** the workflow finishes
- **THEN** `deploy-api-development` does not run and no new revision is created

#### Scenario: No-build success does not block the deploy

- **GIVEN** a push to `develop` that touches only `apps/web/`
- **WHEN** `ci` and `api-image` both conclude `success` (the latter with its build steps skipped)
- **THEN** `deploy-api-development` runs and its own change detection decides, as before, whether to deploy

#### Scenario: Vercel check is unaffected

- **WHEN** Vercel Deployment Checks evaluate a commit
- **THEN** they still depend only on the job `Format, Lint, Typecheck, Build & Test`
