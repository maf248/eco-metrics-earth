# Design: Pin the API base image by digest and add Dependabot

## Findings from the investigation

- The Dockerfile is at the **repository root** (`/Dockerfile`), not `apps/api/Dockerfile`. `deploy-api.yml` builds it with the repo root as context. Dependabot therefore uses `directory: "/"` for `docker`.
- It has two `FROM node:24-alpine` lines (builder, runtime). They are the only container images in the repo. Workflows reference no `container:` or `services:` images; `deploy-api.yml` only has an `image:` input for the Artifact Registry tag of our own image.
- Actions in use (all referenced by **major tag**, never by SHA): `actions/checkout@v7`, `actions/setup-node@v7`, `google-github-actions/auth@v3`, `google-github-actions/deploy-cloudrun@v3`, `docker/login-action@v4`. Tag references are the existing convention, so no SHA pinning is proposed.
- `.nvmrc` is `24`; `ci-node-version` requires Node 24 in CI/release and `AGENTS.md` mandates Node 24 LTS and `@types/node@24.x`.
- commitlint (`commitlint.config.js`) allows types `feat, fix, docs, style, refactor, test, chore` only (no `ci`); `scope-empty` is a warning. It runs only in the local husky `commit-msg` hook, not in CI, so Dependabot commits are not rejected by it, but they should still comply.
- The current spec text says the tag "stays floating in this change" (D6 of an older change); this change supersedes that.

## Technical approach

### D1. Dockerfile

Only the two `FROM` lines change:

```dockerfile
FROM node:24-alpine@sha256:<index-digest> AS builder
...
FROM node:24-alpine@sha256:<index-digest>
```

The digest is the **multi-arch index** digest (the `Docker-Content-Digest` of the tag's manifest list/OCI index). Docker ignores the tag when a digest is present, but Dependabot and humans use the tag for readability and to know which line to follow. Same digest in both stages, so a single Dependabot PR updates both.

### D2. `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: docker
    directory: /
    target-branch: develop
    schedule:
      interval: weekly
    commit-message:
      prefix: 'chore(deps)'
    ignore:
      - dependency-name: node
        update-types: ['version-update:semver-major']

  - package-ecosystem: github-actions
    directory: /
    target-branch: develop
    schedule:
      interval: weekly
    commit-message:
      prefix: 'chore(deps)'
    groups:
      github-actions:
        patterns: ['*']
```

The file must pass `npx prettier --check .github/dependabot.yml` (the `format:check` script does not cover YAML), so quoting and indentation follow the repo's Prettier output.

Rationale per key:

- `target-branch: develop`: `main` only receives PRs from `develop`; Dependabot PRs follow the branch strategy. Note `target-branch` also makes Dependabot read manifests from `develop`, which is the intended source of truth.
- `commit-message.prefix: 'chore(deps)'`: with a prefix Dependabot lowercases the subject (`chore(deps): bump actions/checkout from 7 to 8`). `ci` is not an allowed type, so `chore` is used for actions too.
- `ignore ... semver-major` for `node`: for `node:24-alpine` the tag major is the version; ignoring majors keeps the 24 line while still allowing the digest of the `24-alpine` tag to refresh (a digest-only refresh is not a version change). Moving to Node 26 LTS later is a deliberate spec (and then this ignore rule is updated).
- Weekly + a single group for actions limits noise: with major-tag references, updates are majors, which Dependabot would otherwise open as one PR per action.
- Docker needs no group: one image, and both `FROM` lines share the same digest, so Dependabot rewrites them in one PR.

### D3. How the digest is obtained

No docker socket is available; the registry HTTP API is queried (steps in tasks.md): anonymous pull token from `auth.docker.io`, then a `HEAD` on `registry-1.docker.io/v2/library/node/manifests/24-alpine` with `Accept` for OCI index and Docker manifest list, reading `Docker-Content-Digest`. Verified during this investigation: the endpoint returns `content-type: application/vnd.oci.image.index.v1+json` with a digest (the coder must re-resolve it at implementation time, not reuse a value from this document, because the tag moves).

### D4. Spec placement

- New capability `dependency-updates` owns the Dependabot behavior.
- `api-cloud-run-deploy` gets a MODIFIED copy of the Dockerfile requirement (full text with all prior scenarios, plus two new scenarios) because the old wording ("the tag stays floating") would otherwise contradict the change.
- `ci-node-version` is untouched: Dependabot's ignore rule is expressed in `dependency-updates`, which references that capability in prose.

### D5. Release and deploy outcome

- **Deploy:** the Dockerfile is in the api-affecting path list of `Detect api-affecting changes` (`deploy-api.yml`), so this change, and every merged Dependabot digest PR, deploys the API to dev (from `develop`) and later to production (from `main`). That is desired: a refreshed base image must reach Cloud Run. Action-only PRs touch `.github/workflows/*`; only `deploy-api.yml` is in the path list, so an action bump in `deploy-api.yml` deploys and bumps elsewhere do not.
- **Release:** semantic-release runs on `main` per stream. Commits are `chore(deps): ...`. In the `conventionalcommits` preset `chore` is not releasable, and the api/web `releaseRules` only add scope exclusions, so none of the three streams (root, web, api) releases for these commits alone. A digest refresh therefore deploys but does not bump the API version or write a changelog entry. Accepted: the digest in git history is the audit trail. If the team later wants security base-image bumps to produce an API patch release, switch the docker prefix to `fix(api)` (decided against: a release per Alpine/Node patch would be changelog noise).
- **Activation:** Dependabot reads `dependabot.yml` only from the default branch, which is `main`. `target-branch: develop` sets where PRs are opened and which branch manifests are read from, not where the config is read. So Dependabot starts only after the next `develop` → `main` PR; until then the pinned digest simply stays as is.
- **CI:** Dependabot pushes trigger `ci.yml` (`push: branches ['**']`). The CI job needs no secrets, so it runs fine for Dependabot. Deploy jobs only run for `main`/`develop` pushes, so the PR branches never deploy. The Docker image build itself is not part of CI (only `api:prune` and an `npm ci` dry run), so a broken base image would surface at the dev deploy after merge; see risks.

## Alternatives considered

1. **Pin by digest only, no Dependabot.** Rejected: freezes OS/Node security patches silently.
2. **Renovate instead of Dependabot.** Rejected: needs an external GitHub App or self-hosting; Dependabot is built into GitHub and the roadmap asks for it.
3. **Pin actions by SHA.** Rejected: not the current convention; would need a comment-version convention to stay readable. Out of scope.
4. **Pin to an exact Node version tag (`node:24.x.y-alpine`).** Rejected: more churn (a PR for every patch) for no extra reproducibility over a digest; the roadmap asks for `node:24-alpine` + digest.
5. **Digest of the amd64 manifest only.** Rejected: ties the build to one architecture and breaks local arm64 builds; the index digest resolves per platform.

## Risk assessment

| Risk                                                                                   | Mitigation                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrong digest (single-platform manifest, or a stale value)                              | Resolve at implementation time with the `Accept` headers for index types; verify content type is an index; verify with a second request by digest (task 3).                                                                                                                 |
| Dependabot updates only one `FROM` line, leaving the stages on different digests       | Same image reference in both lines is handled by Dependabot's Dockerfile updater; first Dependabot PR must be reviewed to confirm both lines changed. Spec scenario "Both stages pin the same base image digest" documents the invariant.                                   |
| A bad base image reaches dev unnoticed (CI does not build the image)                   | The merge to `develop` deploys to the dev service and the post-deploy verification exercises `/api/v1/health` and a real endpoint; production only gets it via `develop` to `main`. Adding a CI image build is out of scope; it is recorded as a new ROADMAP item (task 8). |
| Dependabot proposes a Node major                                                       | `ignore semver-major` on `node`; scenario "Newer Node major is not proposed".                                                                                                                                                                                               |
| Dependabot PR noise                                                                    | Weekly schedule, one grouped actions PR, one docker PR.                                                                                                                                                                                                                     |
| Dependabot major action bumps break workflows (e.g., `google-github-actions/*` inputs) | PRs go to `develop` and run CI; the reviewer checks release notes of grouped majors before merging. No auto-merge.                                                                                                                                                          |
| The new YAML is not Prettier-formatted (`format:check` skips YAML)                     | Task runs Prettier on the file.                                                                                                                                                                                                                                             |
| Commit messages of Dependabot PRs exceed commitlint body limits                        | commitlint runs only in the local husky hook, not in CI; squash-merging a Dependabot PR uses its title (`chore(deps): ...`), which is valid.                                                                                                                                |
