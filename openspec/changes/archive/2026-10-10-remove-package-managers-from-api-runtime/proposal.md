# Proposal: Remove package managers from the API runtime image and enable Dependabot alerts

## Why

A Trivy scan of the pinned base image (`node:24-alpine@sha256:ebfe2f90…`) reports 8 HIGH vulnerabilities (Docker Scout reports 9), and every one of them lives in the npm bundled with the image (`/usr/local/lib/node_modules/npm/`: `brace-expansion`, `tar`, `undici`, `ip-address`, `http-cache-semantics`). Alpine and the Node binary have none.

The runtime stage never runs a package manager: it starts with `node main.js` and its dependencies are installed in the builder stage. npm, npx, corepack and yarn are dead weight in production that keeps scanners red with findings we can neither exploit nor fix, and that would hide a real finding the day one appears. Waiting for upstream does not solve it quickly: the fixes need a new npm release and a new Node image that ships it.

Separately, GitHub Dependabot alerts were off. They were enabled on 10 Oct 2026 (repository setting, already applied) so known CVEs in the npm lockfile surface in the Security tab. Automated security-fix PRs stay off because GitHub always opens them against the default branch (`main`), which only receives PRs from `develop`.

## Goals

- The API runtime image contains no package manager: npm, npx, corepack and yarn are removed in the runtime stage.
- The builder stage is unchanged and keeps using npm.
- The Dependabot alerts / no-security-PRs decision is part of the `dependency-updates` capability and documented for contributors.

## Non-Goals

- No switch to a distroless or different base image.
- No change to the builder stage, the base image digest, `CMD`, `ENTRYPOINT`, user, or deploy workflow.
- No CI image build (tracked as ROADMAP I13).
- No change to the npm advisories in development tooling (tracked in the ROADMAP status table).

## Impact

- `Dockerfile`: one `RUN` in the runtime stage.
- `openspec/specs/api-cloud-run-deploy/spec.md`: the Dockerfile requirement forbids package managers in the runtime image (MODIFIED, one new scenario).
- `openspec/specs/dependency-updates/spec.md`: new requirement for alerts on / security-fix PRs off.
- `apps/api/README.md` and `AGENTS.md` ("Dependency Management"): one sentence each.
- Runtime effect: the `Dockerfile` is an api-affecting path, so the merge to `develop` deploys to dev, then to production through the usual `develop` → `main` PR. Committed as `fix(api)`: it changes the production artifact for security reasons, so it cuts an API patch release with a changelog entry, plus a root `v*` patch release as every `fix(api)` does today (unlike routine `chore(deps)` digest bumps).
