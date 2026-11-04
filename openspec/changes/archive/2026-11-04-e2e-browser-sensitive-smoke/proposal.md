# Proposal: Run in every browser only what varies by browser

## Why

The E2E suite (`apps/web/e2e/`, Playwright) runs five projects. `chromium-desktop` runs every test; `firefox-desktop`, `webkit-desktop`, `mobile-chrome` and `mobile-safari` run only tests tagged `@smoke`. Many `@smoke` tags sit on checks that do not depend on the browser (HTTP headers, server HTML, meta tags, direct API requests), so the four extra projects repeat work that proves nothing new.

Measured:

- The E2E step went from 5.2 min (342 tests, 24 Oct 2026) to about 13-19 min (574 tests, 2 Nov 2026); its timeout is 20 min. CI runs it with 1 worker on a 2-vCPU runner (2 workers were tried and reverted: webkit and mobile-safari tests timed out).
- The four non-chromium projects are about 56% of E2E time. Each new provider-backed category adds about 2.5 min, about 70% of it from its `@smoke` tests repeated in those four projects; with 8 categories still to connect the step would reach about 40 min.
- `trace: 'retain-on-failure'` records a trace for every test and drops it when the test passes: about 28% of E2E time in a local comparison. CI never uploads `test-results/`, so those traces are never seen.
- Actions minutes matter: private repo on GitHub Free (2000 min/month), about 1370 min used in the last 30 days and rising.

## Goals

- No test is deleted or rewritten: only `@smoke` tags move, so `chromium-desktop` keeps every test.
- Run browser-independent specs only in `chromium-desktop`: `seo.spec.ts`, `security-headers.spec.ts`, `api-health.spec.ts`.
- In each category spec keep `@smoke` on the visual and interaction checks the engine or viewport can change (render with chart, horizontal overflow and narrow-viewport layout, the country selector, and the co2 metric toggle); server HTML, metadata, state and health checks run in chromium only.
- Record traces in CI only on the first retry (`on-first-retry`, Playwright's recommended CI setting); local runs keep `retain-on-failure`.
- Document the tagging rule in `AGENTS.md` so new categories follow it.
- Estimated effect (to be confirmed in CI): E2E about 13-19 to about 8-11 min; each new category about 1 min instead of about 2.5; fewer Actions minutes.

## Non-Goals

- No change to the projects, `grep`, workers, retries, timeouts, the CI workflow or branch behavior: all five projects keep running on every branch.
- No sharding and no new tests.
- No change to `a11y`, `mobile-navigation`, `navigation`, `category-navigation` or `rate-limit` specs.

## Impact

- `apps/web/e2e/`: tags only, in `seo`, `security-headers`, `api-health`, `co2-emissions`, `global-temperature`, `energy-sources`, `water-footprint`, `data-sources`.
- `apps/web/playwright.config.ts`: the `trace` value only.
- Specs: new capability `e2e-browser-matrix` (ADDED); the E2E requirements of `co2-emissions-page`, `global-temperature-page`, `api-app-scaffold` and `country-explorer` (MODIFIED), whose "all five projects" and "`@smoke` block" statements would otherwise contradict the rule.
- Docs: `AGENTS.md`, the `npm run e2e` line of `README.md`, and `ROADMAP.md` (the item about reducing E2E duration in GitHub Actions is removed).
