## ADDED Requirements

### Requirement: Dependabot keeps the base image digest and the GitHub Actions current

A `.github/dependabot.yml` file SHALL exist with `version: 2` and exactly two `updates` entries, both with `directory: "/"`, a `weekly` schedule, `target-branch: develop` and `commit-message.prefix: "chore(deps)"`:

- `docker`, for the root `Dockerfile` base image;
- `github-actions`, for the actions referenced in `.github/workflows/*`, with a single group matching every action (`patterns: ["*"]`).

No other ecosystem (in particular `npm`) SHALL be configured. The `chore` type SHALL be used (not `fix`): it is allowed by `commitlint.config.js` and is not releasable, so dependency bumps do not cut releases.

#### Scenario: Configuration covers only the two agreed ecosystems

- **GIVEN** the repository at the commit that implements this change
- **WHEN** `.github/dependabot.yml` is read
- **THEN** `updates` contains exactly one `docker` entry and one `github-actions` entry, both with directory `/`, a weekly interval, `target-branch: develop` and commit prefix `chore(deps)`
- **AND** no `npm` entry is present

#### Scenario: Outdated actions arrive in one PR against develop

- **GIVEN** two or more actions referenced in `.github/workflows/*` have newer versions
- **WHEN** the weekly Dependabot run executes
- **THEN** a single PR updates all of them
- **AND** its base branch is `develop` and its title starts with `chore(deps):`

---

### Requirement: Dependabot never proposes a Node major bump

The `docker` entry SHALL ignore semver-major updates of the `node` image (`dependency-name: "node"`, `update-types: ["version-update:semver-major"]`), so the base image stays on the Node 24 LTS line required by `.nvmrc` and the `ci-node-version` capability. Moving to a new Node major remains a deliberate, specified change.

#### Scenario: Digest refresh within the 24 line is proposed

- **GIVEN** the `node:24-alpine` tag has been re-pointed to a new image digest
- **WHEN** Dependabot runs its docker update
- **THEN** it opens one PR that updates the digest in both `FROM node:24-alpine@sha256:...` lines of the `Dockerfile`

#### Scenario: Newer Node major is not proposed

- **GIVEN** a newer major `alpine` image of Node exists
- **WHEN** Dependabot runs its docker update
- **THEN** it does not open a PR that changes the `24-alpine` tag
