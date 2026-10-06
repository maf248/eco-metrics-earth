## Why

The October 2026 maintenance pass bumped `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` and `@nestjs/testing` to `12.1.2` and `@types/node` to `24.19.1` (patch updates, direct implementation per AGENTS.md). Two canonical specs hard-code the previous patch versions, so they no longer describe the codebase. `api-app-scaffold` was already stale before this pass: it states `@nestjs/swagger` is pinned at `12.1.0`, while `apps/api/package.json` pins `12.0.2`.

## What Changes

- `api-app-scaffold`: update the exact NestJS pins to the installed versions (`12.1.2` for common/core/platform-express/testing, `12.0.2` for swagger, `12.0.1` for config).
- `ci-node-version`: the `@types/node` scenario asserts the Node 24 major (`24.x`) instead of a single patch version, matching the requirement text ("SHALL match the Node.js 24 runtime major version") so routine patch bumps no longer invalidate the spec.

No code or behavior changes — this change only re-aligns the specs with the already-updated dependencies.

## Capabilities

### Modified Capabilities

- `api-app-scaffold`: NestJS exact pins refreshed.
- `ci-node-version`: `@types/node` scenario expressed as the runtime major.

## Impact

- `openspec/specs/api-app-scaffold/spec.md`
- `openspec/specs/ci-node-version/spec.md`
