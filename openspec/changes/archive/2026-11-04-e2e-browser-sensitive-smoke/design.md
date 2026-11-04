# Design: Run in every browser only what varies by browser

## Rule

`@smoke` marks a check whose result can differ by engine or viewport: rendering, layout, focus, keyboard and pointer interaction. Checks of HTTP headers, server HTML, meta tags, structured data, sitemap, manifest, provider state and direct API requests do not depend on the engine and run in `chromium-desktop` only. Tags only move: test titles and bodies are untouched, and a test that loses `@smoke` still runs in chromium.

Playwright supports test-level tags (`test('name', { tag: '@smoke' }, async ...)`), so a describe-level tag is replaced by test-level tags where only part of a block stays in the smoke set. `playwright.config.ts` keeps `grep: /@smoke/` on the four non-chromium projects.

## Browser-independent specs (no `@smoke`)

- `seo.spec.ts`: `<title>`, `<meta>`, `<link rel>`, the trailing-slash server redirect, and `request` checks of sitemap, robots, manifest, social card and raw HTML.
- `security-headers.spec.ts`: `response.headers()` values set by the server.
- `api-health.spec.ts`: `request` against the API, no page.

## Smoke set per spec

Tests that are `@smoke` today are kept or dropped by the rule; a few layout and interaction checks that were chromium-only are newly tagged (marked "new"), so every category keeps its render, layout and main interaction checks in all five projects.

| Spec                                      | Keeps `@smoke`                                                                                                                                                                                                        | Chromium only                                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `co2-emissions.spec.ts`                   | render (heading, key figures, chart, attribution); no horizontal overflow; select Argentina by typing, with flag and chart title; metric toggle by click and arrow keys; 360 px no overflow with 44 px controls (new) | stale/unavailable state, origin credit, server HTML, schema.org Dataset, title/canonical, World globe, URL unchanged |
| `global-temperature.spec.ts`              | render with the Copernicus credit; no horizontal overflow; select Argentina by typing, with flag and chart title; 360 px no overflow with 44 px controls (new)                                                        | stale/unavailable state, server HTML, schema.org Dataset, title/canonical, no measure toggle, URL unchanged          |
| `energy-sources.spec.ts`                  | render with the Ember credit; select Argentina and Generation (TWh) updating chart, donut and year table (new); no horizontal scroll at 375 px with the year table open (new)                                         | stale/unavailable state, server HTML, schema.org Dataset, title/canonical, methodology and measures                  |
| `water-footprint.spec.ts`                 | render with heading, product data and filters; table on desktop and card list on mobile (new)                                                                                                                         | server HTML, title/canonical                                                                                         |
| `data-sources.spec.ts`                    | the water-footprint sources list with publisher and license                                                                                                                                                           | the other listings, server HTML, title/description/canonical                                                         |
| `a11y`, `mobile-navigation`, `navigation` | unchanged: engine and viewport sensitive (axe contrast and focus, mobile bar, home render)                                                                                                                            | unchanged                                                                                                            |

## Traces

`use.trace` becomes `process.env.CI ? 'on-first-retry' : 'retain-on-failure'`. In CI a passing test records nothing and a failing test is traced on its first retry (CI has 2 retries). Locally (no retries) failures keep their trace. A warm local comparison of the same 59 tests (chromium and webkit, 1 worker, 2 cores) took 2.9 min with traces and 2.1 min without.

## Expected counts (`--list`)

`chromium-desktop` 218 before and after; each other project 89 before and 35 after (a11y 9, mobile-navigation 9, co2-emissions 5, global-temperature 4, energy-sources 3, water-footprint 3, data-sources 1, navigation 1). The implementer records the real numbers.

## Risks

- A browser-specific regression in a de-tagged check goes unnoticed outside chromium. Mitigation: those checks are engine-independent by construction, and the visual and interaction checks of each category stay in all five projects.
- The newly tagged tests (marked "new") had never run outside chromium. They pass in all five projects locally; if one proves flaky in CI, its tag is removed.
- With `on-first-retry`, a failure that never reaches a retry has no trace; CI retries every failure, so this only affects local `CI=1` runs with `--retries=0`.
