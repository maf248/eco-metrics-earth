## 1. Sectioned loads

- [x] 1.1 `SectionState` with `failed`; `Promise.allSettled` in `defineSectionedProviderCategoryPage`, Sentry report per failed section, rethrow when all fail, `failed` counts as degraded
- [x] 1.2 `ProviderBackedContent`, `OceanSection`, `DeforestationSection` render nothing for `failed`
- [x] 1.3 Unit tests: registry (partial, total, degraded, report), components (hidden section, key figures)

## 2. Category boundary

- [x] 2.1 `DataUnavailable` without a provider name
- [x] 2.2 `app/[category]/error.tsx` with the category header, the warning panel and "Try again"; Sentry only without digest
- [x] 2.3 Unit tests for the boundary and the 30-day `expire`

## 3. Close

- [x] 3.1 `docs/design-system.md`: hidden failed section and the category error state
- [x] 3.2 Gates: format, lint, typecheck, unit tests, build, category E2E; local production check of the stale-if-error behavior and the `500` with the warning panel
- [x] 3.3 Close the roadmap item; `AGENTS.md` updated
- [x] 3.4 Archive the change
