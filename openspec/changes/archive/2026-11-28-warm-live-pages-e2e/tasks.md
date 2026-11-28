## 1. Implementation

- [x] 1.1 `apps/web/e2e/global-setup.ts`: request the live category pages and `/data-sources/` once, in parallel, with a timeout. Log each page; never throw.
- [x] 1.2 `globalSetup` in `apps/web/playwright.config.ts`

## 2. Validation

- [x] 2.1 Run the shard with the flaky test and the full suite locally with `CI=1` and 2 workers. Compare the times with the previous runs (shard 4: 222 s; full: 725 s).
- [x] 2.2 Gates: format, lint, typecheck, unit tests

## 3. Close

- [x] 3.1 AGENTS.md: mention the warm-up next to the E2E workers note
- [x] 3.2 Archive the change
