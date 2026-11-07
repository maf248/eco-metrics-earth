# Spec Delta

## MODIFIED Requirements

### Requirement: E2E coverage on push is provided by CI, not the local hook

Removing E2E from the local hook SHALL NOT reduce E2E coverage of pushed code: the CI workflow (`.github/workflows/ci.yml`) runs the full Playwright suite (`npm run e2e`) on every push to every branch (`on: push: branches: ['**']`); a pull request shows the checks of the push run on its head commit. This requirement records the safety-net contract the slimmed hook relies on — if CI's E2E step is ever removed or made conditional, this requirement is violated and the hook design must be revisited.

#### Scenario: A push to develop triggers full E2E in CI

- **GIVEN** a commit pushed to `develop` (or any branch)
- **WHEN** the CI workflow triggered by that push completes
- **THEN** the run included lint, typecheck, build, unit tests, and the full E2E suite — a broken E2E fails CI within minutes of the push

#### Scenario: A PR from develop to main is gated by CI including E2E

- **GIVEN** a pull request from `develop` to `main`
- **WHEN** the CI run triggered by pushing its head commit completes
- **THEN** the pull request shows that run's checks, including the full E2E suite, before it is merged
