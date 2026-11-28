## Why

Since E2E runs in four CI shards, each shard starts its own `next dev`, and `next dev` compiles a route on its first request. In the first two sharded runs (`develop` and `main`, 2026-11-27) the same test failed on its first attempt and passed on the retry: `mobile-navigation.spec.ts` "should navigate to correct category when mobile NavLink is clicked" on webkit. It is the first test of shard 4 to reach a category page. It clicks a link from `/`, and the URL stays at `/` for the 5 s of `toHaveURL` while the `[category]` route compiles. Before sharding, chromium had compiled that route minutes earlier in the same server. The retry hides the failure, but it costs time, and any shard whose first category visit is a client navigation can hit it.

## What Changes

- Playwright's `webServer.url` points at a category page (`http://localhost:3000/air-quality/`) instead of `/`.
- Playwright polls that URL until it answers. The readiness check therefore compiles the `[category]` route before the first test, in every shard and in local runs.
- Nothing else changes. The wrapper still waits for `/` itself, and the API is still up before the web server starts.

## Capabilities

### Modified Capabilities

- `e2e-server-readiness`: the readiness URL is a category page.

## Impact

- `apps/web/playwright.config.ts` only. No app code, CI or dependency change.
- Local reuse still works: a running dev server answers the category URL.
