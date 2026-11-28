## Why

Each CI shard starts its own `next dev`, which compiles a page the first time it is requested. The readiness URL already compiles the `[category]` route before the first test. A live category page also compiles its own components and makes its first data read on its first visit. In the third sharded run (`develop`, 2026-11-28), `navigation.spec.ts` "should open a category from its card" failed on its first attempt on webkit and passed on the retry. That test is the first visit to `/co2-emissions/` in shard 4, made by a client navigation, and the URL stayed at `/` for the 5 s of `toHaveURL`. Any shard whose first visit to a live page is a client navigation can hit this.

## What Changes

- A Playwright `globalSetup` (`apps/web/e2e/global-setup.ts`) requests every live category page and `/data-sources/` once, in parallel, before the first test. Playwright runs `globalSetup` after the `webServer` is ready.
- It is best effort. It logs each page's status and time, and never fails the run: a broken page is reported by its own tests.
- The work moves rather than grows: today each shard pays for these compilations during its tests anyway.

## Capabilities

### Modified Capabilities

- `e2e-server-readiness`: new requirement for warming the live pages before the first test.

## Impact

- `apps/web/e2e/global-setup.ts` (new) and `apps/web/playwright.config.ts` (`globalSetup`). No app code, CI or dependency change.
- Local runs with a reused dev server also run the warm-up; already compiled pages answer in milliseconds.
