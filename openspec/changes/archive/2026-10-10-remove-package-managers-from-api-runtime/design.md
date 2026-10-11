# Design: Remove package managers from the API runtime image

## Findings

Read from the image config and history of the pinned digest (amd64 manifest), without a Docker daemon:

- The official Node tarball installs npm and corepack under `/usr/local/lib/node_modules/` with the symlinks `/usr/local/bin/npm`, `/usr/local/bin/npx` and `/usr/local/bin/corepack`.
- The image also installs Yarn classic (`YARN_VERSION=1.22.22`) under `/opt/yarn-v1.22.22` with the symlinks `/usr/local/bin/yarn` and `/usr/local/bin/yarnpkg`.
- `ENTRYPOINT ["docker-entrypoint.sh"]` is a small shell script that execs `node` when the first argument is not a command; it does not use any package manager. Our `CMD ["node", "main.js"]` is unchanged.
- The runtime stage only needs the `node` binary and `/app` (copied from the builder with its `node_modules`).

## D1. One `RUN` in the runtime stage, before `COPY` and `USER node`

```dockerfile
FROM node:24-alpine@sha256:<digest>

# The runtime only runs `node main.js`; dependencies are installed in the
# builder. Removing the bundled package managers drops their CVEs from the image.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
      /opt/yarn-v* /usr/local/bin/yarn /usr/local/bin/yarnpkg
```

- Explicit paths, not `rm -rf /usr/local/lib/node_modules`, so a future base image that adds something there is not silently removed.
- The glob `/opt/yarn-v*` follows Yarn version bumps in the base image, and `-f` makes missing paths a no-op, so the build stays green if a later Node image stops shipping corepack or yarn (Node 25+ no longer bundles corepack).
- It runs as root, before `USER node`, and before `COPY` so the layer is cached independently of the app.

## D2. Size and scanners

The files still exist in the base layers (a later layer only adds whiteouts), so the compressed image size barely changes; the goal is the runtime filesystem, not bytes. Scanners (Trivy, Docker Scout) analyze the merged filesystem and honor whiteouts, so the removed packages no longer count as installed.

## D3. Dependabot alerts

Alerts are a repository setting (`PUT /repos/{owner}/{repo}/vulnerability-alerts`), already enabled; automated security fixes (`/automated-security-fixes`) are verified `enabled: false`. Security-fix PRs cannot set a target branch and would always target `main`, breaking the `develop` → `main` flow; version-update PRs (configured in `.github/dependabot.yml`) already go to `develop`. Fixes for alerts are applied manually on `develop`.

## Verification

- No Docker daemon is available to the agent. Verification of the image is: the dev deploy after merge to `develop` (`/api/v1/health` 200, `/api/v1/water-footprint/products` 200), plus an optional local `docker build` by the user.
- Quick check on a built image: `docker run --rm --entrypoint sh <image> -c 'command -v npm npx corepack yarn yarnpkg || echo none-found'` prints `none-found` (`--entrypoint sh` bypasses `docker-entrypoint.sh`).
- After deploy, a Trivy scan of the built image (from Artifact Registry, or of a local build) should report no HIGH/CRITICAL findings under `/usr/local/lib/node_modules/npm/`.

## Risks

| Risk                                                  | Mitigation                                                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Something at runtime shells out to npm/npx            | `CMD` is `node main.js`; `grep` of `apps/api/src` for `npm`/`npx` child processes finds none.       |
| No package manager inside the container for debugging | Debug with the builder stage or locally; Cloud Run containers are not debugged interactively today. |
| A future base image moves these paths                 | `rm -rf` on missing paths is a no-op; the scan in Verification shows if anything slips back in.     |
