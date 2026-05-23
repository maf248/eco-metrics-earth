## Why

eco-metrics earth has 194 passing unit tests but zero End-to-End (E2E) validation. Bugs in real browser interactions -- navigation flows, SEO compliance, API connectivity, accessibility -- can go completely unnoticed. The roadmap identifies this as the #1 priority (P1) and the project's only red-category gap. Adding Playwright E2E tests now, before the codebase grows with real eco-category data (P2), establishes a safety net that catches regressions in critical user journeys from day one.

## What Changes

- **New NX project `apps/web-e2e`** -- generated via `@nx/playwright:project`, following the standard NX E2E project pattern (same as `@nx/cypress` would create).
- **Playwright test suite** covering:
  - Home page render (logo, brand text, heading, skip-to-content link)
  - All 11 eco-category pages (URL, title, meta tags, OG tags, canonical URL, icon presence, heading)
  - Navigation between categories via Navbar (desktop sidebar + mobile bottom bar)
  - 404 page (custom NotFoundIcon, link home)
  - API health endpoint: `GET /api/v1/health` returns 200
  - API error handling: `GET /api/v1/nonexistent` returns 404
  - SEO artifacts: `sitemap.xml`, `robots.txt`, PWA `manifest.webmanifest`
  - Security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
  - Accessibility audits via `@axe-core/playwright` on home + category pages
  - Mobile-specific behaviors: MobileHeader visibility, bottom Navbar, NavScrollContainer horizontal scroll
- **Multi-browser configuration**: Chromium, Firefox, WebKit (desktop) + Mobile Chrome (Pixel 5) + Mobile Safari (iPhone 12)
- **CI integration**: E2E step added as the final check in `.github/workflows/ci.yml`
- **Traces on failure**: `retain-on-failure` for zero-overhead debugging
- **New dependencies**: `@nx/playwright@22.7.3`, `@playwright/test@1.60.0`, `@axe-core/playwright@4.10.1` (all pinned, no caret/tilde)

## Capabilities

### New Capabilities

- `e2e-playwright-config`: Playwright + NX integration -- project scaffolding, playwright.config.ts with 5 browser projects, webServer auto-start, NX inferred targets, CI-ready config
- `e2e-navigation`: Cross-category navigation tests -- home to each of 11 categories, desktop sidebar NavLink clicks, mobile bottom bar + scroll, aria-current state verification, 404 page flow
- `e2e-seo`: SEO compliance validation -- trailing slash enforcement, title + meta description on every page, Open Graph + Twitter card tags, canonical link, sitemap.xml valid XML with 12 entries, robots.txt rules, PWA manifest.webmanifest valid JSON
- `e2e-api-health`: API smoke tests -- health endpoint returns 200 + ok status, nonexistent route returns 404 JSON, CORS headers present
- `e2e-security-headers`: Security header validation -- X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, Content-Security-Policy presence
- `e2e-a11y`: Automated accessibility audits -- axe-core scan on home page and all 11 category pages, zero violations
- `e2e-mobile`: Mobile-specific tests -- MobileHeader visible at viewport under 768px, bottom Navbar instead of sidebar, NavScrollContainer horizontal scroll affordances, category navigation from bottom bar

### Modified Capabilities

<!-- None -- this change is purely additive. No existing specs need modification. -->

## Impact

- **New NX project**: `apps/web-e2e/` with playwright.config.ts, e2e/ test directory, tsconfig.json, and project.json / Nx targets
- **Dependencies added** (root devDependencies): @nx/playwright@22.7.3, @playwright/test@1.60.0, @axe-core/playwright@4.10.1
- **CI workflow**: .github/workflows/ci.yml -- new step after Test that runs `npx nx e2e web-e2e`
- **Browser binaries**: ~/.cache/ms-playwright/ (installed via `npx playwright install --with-deps`)
- **No changes** to apps/web/, apps/api/, or packages/shared/ source code -- purely additive testing layer
- **Test runtime**: ~30-60 seconds locally (Chromium only), ~3-5 minutes in CI (all 5 browsers, but smoke-only for non-Chromium)

## Non-Goals

- Visual regression/screenshot testing (Playwright snapshots) -- not included now
- API-to-UI integration tests (web fetching real data from API) -- blocked on P2 (eco-category modules)
- Performance/lighthouse testing -- separate concern
- Production URL testing -- localhost only; no external endpoints
- HTML reporter -- not requested at this stage
- Tests for future eco-category data (P2) -- they will be added when P2 ships
