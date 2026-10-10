# Proposal: Pin the API base image by digest and add Dependabot

Roadmap item: **I12**.

## Why

The root `Dockerfile` (build context = repo root, used by `deploy-api.yml`) declares `FROM node:24-alpine` in both the `builder` and the runtime stage. The tag is floating: it keeps OS and Node security patches flowing, but two builds of the same commit made on different days can start from different base images, so the image is not reproducible at the base level. A digest fixes that, but a digest with no automatic updater would freeze those security patches, so the pin and the updater ship together.

## Goals

- Pin both `FROM` lines to the multi-arch index digest of `node:24-alpine`, keeping the readable tag alongside it (`node:24-alpine@sha256:<digest>`), with the same digest in both stages.
- Add `.github/dependabot.yml` so Dependabot opens update PRs for:
  - the Docker base image digest (ecosystem `docker`, directory `/` because the `Dockerfile` lives at the repo root), and
  - the GitHub Actions versions used in `.github/workflows/*` (ecosystem `github-actions`, directory `/`).
- Keep the Node 24 LTS convention (`.nvmrc`, `ci-node-version`): Dependabot must never propose a Node major bump.
- Dependabot PRs target `develop` (the integration branch), use a Commitizen-valid commit message, are scheduled weekly and grouped to limit noise.

## Non-Goals

- No npm ecosystem in Dependabot (the roadmap does not ask for it; `AGENTS.md` pins exact versions and handles npm updates manually).
- No pinning of GitHub Actions to commit SHAs. The repo convention today is major-tag references (`actions/checkout@v7`, etc.); Dependabot just keeps those current.
- No change to the Node version, to `.nvmrc`, or to the CI `Setup Node.js` steps.
- No change to the build logic of the `Dockerfile` (only the two `FROM` lines), to `deploy-api.yml`, `ci.yml`, or `release.yml`.
- No auto-merge, no Dependabot security-update tuning, no labels/reviewers/assignees configuration.
- No `ci` commit type is introduced (commitlint allows only `feat|fix|docs|style|refactor|test|chore`).
- No Docker daemon usage by the agent; the digest is resolved through the registry HTTP API.

## Impact

- `Dockerfile`: two `FROM` lines change to `node:24-alpine@sha256:...`.
- New file `.github/dependabot.yml`.
- `openspec/specs/api-cloud-run-deploy/spec.md` (via archive): the Dockerfile requirement no longer says the tag stays floating.
- New canonical capability `dependency-updates` (via archive).
- `ROADMAP.md`: I12 removed, I13 renumbered to I12, cross-references updated.
- Runtime effect: the Dockerfile is in the api-affecting path list, so merging this change to `develop` triggers one dev deploy; the image content is unchanged unless the pinned digest is newer than the cached floating tag. No release is produced (see design.md D5).
