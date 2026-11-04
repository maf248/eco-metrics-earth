# Tasks

- [x] 1. Record the baseline with `npx playwright test -c apps/web/playwright.config.ts --list`: tests per project (expected `chromium-desktop` 218, each other project 89).
- [x] 2. In `apps/web/e2e/seo.spec.ts`, `security-headers.spec.ts` and `api-health.spec.ts`, remove every `@smoke` tag. Change nothing else. (Scenario: Browser-independent specs run only in chromium)
- [x] 3. In `co2-emissions.spec.ts`, `global-temperature.spec.ts`, `energy-sources.spec.ts`, `water-footprint.spec.ts` and `data-sources.spec.ts`, replace the describe-level `@smoke` tags with test-level tags on exactly the tests listed under "Keeps `@smoke`" in `design.md`. Change nothing else. (Scenarios: Visual and interaction checks stay in every browser; Chromium coverage is unchanged)
- [x] 4. In `apps/web/playwright.config.ts`, set `trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure'` with a one-line comment (CI does not upload traces; recording every test costs about a quarter of the run). (Scenario: CI records traces only on retry)
- [x] 5. `AGENTS.md`: add a short "Smoke tagging" rule under Testing Conventions (`@smoke` only for checks the engine or viewport can change: render, layout, keyboard and pointer interaction; headers, SEO/HTML, metadata, state and API checks run in chromium only; tags move, tests are never deleted to apply it), and one sentence pointing to it in the E2E step of "Adding an OWID-backed category". (Scenario: Rule is documented)
- [x] 6. `README.md`: extend the `npm run e2e` comment to say `@smoke` is for browser or viewport sensitive checks.
- [x] 7. `ROADMAP.md`: delete the item about reducing E2E duration in GitHub Actions and the "CI/CD" subsection heading if it becomes empty. Check that no other document refers to that item.
- [x] 8. List tests per project again and record the counts: `chromium-desktop` still 218, each other project 35, and the per-spec split matches `design.md`.
- [x] 9. Run `npm run format:check`, `npm run lint` and `npx openspec validate e2e-browser-sensitive-smoke --strict`.

## Post-push verification (manual, for the user; not a coder task)

- Run `npm run e2e` locally and confirm it passes.
- In CI, compare the E2E step time with the previous 13-19 min (estimate: about 8-11 min).
