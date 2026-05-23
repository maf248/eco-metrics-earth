## Why

The current Vercel `ignoreCommand` uses an **allowlist** approach: it skips a deploy unless changed files touch `apps/web/` or `packages/shared/`. This is brittle and dangerous — changes to monorepo-root configuration files (`package.json`, `nx.json`, `tsconfig.base.json`, `vercel.json` itself) can silently break the web build without triggering a deploy. The broken state lies dormant until a future change to `apps/web/` triggers a deploy that suddenly fails.

A **denylist** approach is safer: always deploy, except when ALL changed files fall within known-safe, inert scopes. The cost of an unnecessary deploy is a few seconds of compute; the cost of a missed deploy is broken production discovered too late.

## What Changes

- **Invert `ignoreCommand` logic** in `vercel.json` from allowlist to denylist.
- Deploy will be **skipped only** when every changed file is within:
  - `apps/api/` — deployed separately on Railway, irrelevant to Vercel
  - `openspec/` — spec artifacts, no runtime effect
  - `*.md` files — documentation only (README, ROADMAP, AGENTS, etc.), inert at build time
- `.github/` is intentionally **NOT** in the denylist — CI changes that break the release pipeline should be surfaced via a deploy failure, not silently swallowed.
- Any change outside these denylist scopes — including root configs, shared types, web code — will trigger a deploy.

## Capabilities

### New Capabilities

- `vercel-deploy-deny-list`: Vercel ignores builds only when all changed files are in documented safe scopes (api/, openspec/, *.md). Everything else triggers a deploy.

### Modified Capabilities

<!-- No existing specs cover the Vercel ignoreCommand — this is a new capability. -->

## Impact

- **Affected code**: Only `vercel.json` — the `ignoreCommand` field changes, nothing else.
- **Affected systems**: Vercel deployment pipeline. Railway (api) and local dev are unaffected.
- **No breaking changes**: No API, shared types, or runtime behavior changes.

## Non-Goals

- This change does NOT modify the Railway deployment pipeline for `apps/api/`.
- It does NOT add or remove any environment variables, build commands, or framework settings.
- It does NOT introduce any new project structure or dependencies.
- It does NOT change how semantic-release or GitHub Actions trigger deploys.
