## 1. Registry

- [x] 1.1 Optional `lastModified(data)` on `CategoryPageDefinition`, derived by `defineProviderCategoryPage` and `defineSectionedProviderCategoryPage` (latest across sections with a payload); `waste-recycling` declares its own
- [x] 1.2 `getCategoryLastModified(category)`: cached read plus `lastModified`, `undefined` on any failure or unknown date
- [x] 1.3 Unit tests for the derivations and the failure fallback

## 2. Sitemap

- [x] 2.1 `sitemap.ts` async, awaits `connection()`, reads every live category concurrently, `maxDuration = 30`
- [x] 2.2 Category entries carry their date; home and data sources carry the latest; unknown dates are omitted
- [x] 2.3 Unit tests updated; E2E sitemap check still green

## 3. Close

- [x] 3.1 Gates: format, lint, typecheck, unit tests, build, SEO E2E
- [x] 3.2 Close the roadmap item and update `apps/web/README.md`
- [x] 3.3 Archive the change
