# Design: ci-playwright-container

## Technical approach

### Container block

```yaml
ci:
  name: Format, Lint, Typecheck, Build & Test # unchanged contract
  runs-on: ubuntu-latest
  timeout-minutes: 30
  container:
    image: mcr.microsoft.com/playwright:v1.63.0-noble
    options: --init --ipc=host
  env:
    HOME: /root
```

- `--ipc=host` is Playwright's recommendation for Chromium in Docker (avoids shared-memory crashes). `--init` reaps zombies, which matters because `run-dev-servers.ts` spawns and kills nx/next/nest process trees.
- `HOME=/root`: Playwright's CI docs require it for Firefox in containers; GitHub otherwise sets `HOME=/github/home`. The job runs as root, so Chromium sandboxing is already disabled by Playwright's default (`chromiumSandbox: false`).
- Allowed contexts in `jobs.<id>.container.image`: `github`, `needs`, `strategy`, `matrix`, `vars`, `secrets`, `inputs`. The `env` context is NOT available there (and the `job` context does not expose the image). Hence the tag is a single literal in `ci.yml`, and the guard reads that literal from the file. A repository variable (`vars`) was rejected: it lives outside the repo and would make the pin invisible in review.

### Version guard

`scripts/check-playwright-image.mjs` (Node, no dependencies): extract `mcr.microsoft.com/playwright:v(\d+\.\d+\.\d+)-` from `.github/workflows/ci.yml`, read the version from `node_modules/@playwright/test/package.json`, compare. On mismatch print `Playwright image mismatch: @playwright/test is X but ci.yml uses vY. Set container.image to mcr.microsoft.com/playwright:vX-noble` and exit 1. Placed after `npm ci` (needs the installed package) and before Format check. Because the workflow file read is the one that actually defines the container, the check cannot drift from the real image. Bump procedure (documented in AGENTS.md): when `@playwright/test` changes, update the tag in `ci.yml` in the same change.

### Node and setup-node

Keep `actions/setup-node` with `node-version-file: .nvmrc` and `cache: npm`. It works inside a container, keeps `.nvmrc` the source of truth, preserves the npm cache, and leaves the `ci-node-version` spec untouched; if the image's Node already matches nothing visible changes, and no `apt` is involved either way. Cost: possibly a Node download from GitHub's manifest (small). Alternative of relying on the image's Node (and checking `node --version` major against `.nvmrc`) was rejected because it drops the npm cache and couples correctness to the image's bundled Node.

### Checkout in a container

`actions/checkout@v7` registers the workspace as a git `safe.directory` itself; keep `fetch-depth: 0`. The Playwright image installs `git` and `openssh-client` (verified in `utils/docker/Dockerfile.noble` at tag v1.63.0), so checkout keeps a real `.git` and `fetch-depth: 0` works; the validation run confirms it.

### Timeouts

Keep job `timeout-minutes: 30`. Add `timeout-minutes: 15` to the `E2E` step (replaces the removed 10-minute install guard; the full run is about 7 min for the job). Image pull happens in the "Initialize containers" phase, which is covered by the job timeout only.

### Other steps

`npx nx run api:prune` and `npm ci --dry-run` are pure npm/fs and work as root in the container. Next and Nest builds and the E2E servers use `localhost` ports 3000/3001, which work unchanged in the job container. No docker-based step exists in this job (the API image is built in `deploy-api.yml`), so no Docker-in-Docker is needed.

### Docs

`README.md` CI sentence (mention the container), `AGENTS.md` CI/CD gates (tag pinned to `@playwright/test`, guard, bump rule), `docs/deploy/vercel.md` (job name contract unaffected, job runs in container).

## Alternatives considered

- Keep `playwright install` with an apt mirror/retry: still depends on an external mirror per run.
- Separate E2E job in the container (original idea): needs artifact sharing or rebuilding, and a new check name to gate production; rejected for scope.
- Cache `~/.cache/ms-playwright`: does not cover OS deps, which are the failing part.
- Image tag via `vars`/workflow `env`: not available or less reviewable (see above).

## Risks and mitigation

- MCR pull slowness/outage: same class of risk, but one registry and layer-cached by the runner; job timeout bounds it.
- Version drift on Dependabot bumps: guard fails early with the fix.
- Missing `git`, Firefox `HOME`, nx native binaries or file ownership issues in the container: validated on `feature/ci-playwright-container` before merging to `develop`.
- Larger image pull adds 20-40 s per run; accepted.
