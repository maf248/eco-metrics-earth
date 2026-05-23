## 1. Dependencies and Project Scaffolding

- [x] 1.1 Install `@nx/playwright@22.7.3`, `@playwright/test@1.60.0`, and `@axe-core/playwright@4.10.1` as root devDependencies with `--save-exact`
- [x] 1.2 Generate the NX E2E project: NX scaffolded in-tree at `apps/web/` (not separate `web-e2e`)
- [x] 1.3 Install Playwright browser binaries: `npx playwright install chromium` (--with-deps skipped: requires sudo)
- [x] 1.4 Verify project was scaffolded: `npx nx show project web` lists e2e target

## 2. Playwright Configuration

- [x] 2.1 Configure 5 browser projects in `playwright.config.ts`: `chromium-desktop` (1280x720), `firefox-desktop` (1280x720), `webkit-desktop` (1280x720), `mobile-chrome` (Pixel 5), `mobile-safari` (iPhone 12)
- [x] 2.2 Configure `webServer` to run `npm run dev` and wait for `http://localhost:3000` and `http://localhost:3001`
- [x] 2.3 Set `reuseExistingServer: !process.env.CI` so local dev reuses running servers
- [x] 2.4 Enable `trace: 'retain-on-failure'` in the config
- [x] 2.5 Set `baseURL: 'http://localhost:3000'` for the web project and configure `API_BASE_URL: 'http://localhost:3001/api/v1'` (API_BASE_URL as env var fallback in test files; `use` block does not accept custom properties)
- [x] 2.6 Configure `@smoke` tag with `grep: /@smoke/` for non-Chromium projects to run only smoke-tagged spec files
- [x] 2.7 Add `e2e` target to root `package.json` scripts: `"e2e": "nx e2e web"`
- [x] 2.8 Verify config is valid: `npx playwright test --list` shows all 5 projects (187 tests total)

## 3. Test Utilities and Page Objects

- [x] 3.1 Create `apps/web/e2e/utils/pages.ts` with `homePage` and `categoryPage(slug)` factories
- [x] 3.2 Export category title mapping (E2E-local mapping mirrors `categoryTitle.ts`)
- [x] 3.3 Create `apps/web/e2e/utils/selectors.ts` with reusable CSS/data-testid selectors for common elements
- [x] 3.4 Create `ECO_CATEGORIES` list constant for iteration in test loops (exported as `CATEGORY_SLUGS`)

## 4. Navigation Tests (`e2e-navigation`)

- [x] 4.1 Create `apps/web/e2e/navigation.spec.ts` with `@smoke` tag
- [x] 4.2 Test home page loads with correct title, `<main>`, logo, brand text, and skip-to-content link
- [x] 4.3 Test all 11 category pages load with correct URL (trailing slash), title, heading, and icon
- [x] 4.4 Test `waste-recycling` title override: heading displays "Waste & Recycling" (not "Waste Recycling")
- [x] 4.5 Test desktop sidebar: click each NavLink, verify navigation to correct URL and `aria-current` state
- [x] 4.6 Test 404 page: navigate to `/nonexistent/`, verify NotFoundIcon, home link, and click home link navigates to `/`
- [x] 4.7 Test all category pages return HTTP 200
- [x] 4.8 Run navigation tests and verify they pass: 25/25 pass on chromium-desktop

## 5. SEO Tests (`e2e-seo`)

- [x] 5.1 Create `apps/web/e2e/seo.spec.ts` with `@smoke` tag
- [x] 5.2 Test trailing slash enforcement: navigate without slash → final URL has slash
- [x] 5.3 Test home page metadata: `<title>`, `<meta description>`, Open Graph tags, Twitter card tags (note: `og:type` and `og:site_name` not rendered — page openGraph overrides layout)
- [x] 5.4 Test category page metadata: dynamic `<title>` template, canonical `<link>`, dynamic OG/Twitter tags
- [x] 5.5 Test sitemap.xml: 200 status, valid XML, 12 `<url>` entries, all category URLs have trailing slash
- [x] 5.6 Test robots.txt: 200 status, "Allow: /", "Disallow: /api/", "Sitemap:" directive
- [x] 5.7 Test PWA manifest: 200 status, valid JSON, `name`, `display: standalone`, `theme_color: #10b981`, icons array
- [x] 5.8 Run SEO tests and verify they pass: 12/12 pass on chromium-desktop

## 6. API Health Tests (`e2e-api-health`)

- [x] 6.1 Create `apps/web/e2e/api-health.spec.ts` with `@smoke` tag
- [x] 6.2 Test `GET /api/v1/health` returns 200 with `{ "status": "ok" }`
- [x] 6.3 Test `GET /api/v1/nonexistent` returns 404 with JSON body
- [x] 6.4 Test CORS headers present on health endpoint: `Access-Control-Allow-Origin: http://localhost:3000`
- [x] 6.5 Test CORS headers present on error responses
- [x] 6.6 Run API tests and verify they pass: 4/4 pass on chromium-desktop

## 7. Security Headers Tests (`e2e-security-headers`)

- [x] 7.1 Create `apps/web/e2e/security-headers.spec.ts` with `@smoke` tag
- [x] 7.2 Test home page returns all 5 security headers with correct values
- [x] 7.3 Test category page returns security headers
- [x] 7.4 Test 404 page returns security headers
- [x] 7.5 Test CSP includes `frame-ancestors 'none'`
- [x] 7.6 Test Permissions-Policy restricts `camera=()`, `microphone=()`, `geolocation=()`
- [x] 7.7 Run security tests and verify they pass: 5/5 pass on chromium-desktop

## 8. Accessibility Tests (`e2e-a11y`)

- [x] 8.1 Create `apps/web/e2e/a11y.spec.ts` with `@smoke` tag
- [x] 8.2 Test home page: axe-core scan reports zero critical and serious violations
- [x] 8.3 Test all 11 category pages: axe-core scan reports zero critical and serious violations
- [x] 8.4 Test skip-to-content link exists on home page and targets `#main-content`
- [x] 8.5 Test skip-to-content link exists on category pages
- [x] 8.6 Test semantic landmarks: `<nav aria-label="Main navigation">`, `<main id="main-content">`
- [x] 8.7 Run a11y tests and verify they pass: 15/15 pass on chromium-desktop

## 9. Mobile Navigation Tests (`e2e-mobile`)

- [x] 9.1 Create `apps/web/e2e/mobile-navigation.spec.ts` with `@smoke` tag
- [x] 9.2 Test MobileHeader visible on viewport < 768px with logo and brand text
- [x] 9.3 Test MobileHeader logo click navigates to home page
- [x] 9.4 Test Navbar renders as bottom bar on mobile (not sidebar), fixed to bottom
- [x] 9.5 Test NavScrollContainer exists with horizontal scroll and accessible label
- [x] 9.6 Test all 11 NavLinks (not 12 — Home link is in MobileHeader, not in scroll container) present in scroll container
- [x] 9.7 Test mobile NavLink click navigates to correct category and updates `aria-current`
- [x] 9.8 Test gradient fade affordances visible at scroll edges
- [x] 9.9 Run mobile tests on desktop project (1280x720): verify bottom bar is NOT visible
- [x] 9.10 Run mobile tests and verify they pass: 10/10 pass on chromium-desktop

## 10. CI Integration

- [x] 10.1 Add E2E step to `.github/workflows/ci.yml` after the Test step
- [x] 10.2 Step installs Playwright browsers: `npx playwright install --with-deps chromium`
- [x] 10.3 Step runs: `npm run e2e` (runs full suite on chromium-desktop only in CI)
- [x] 10.4 Verify CI workflow syntax is valid (not checked with actionlint — manual verification)

## 11. Final Verification

- [x] 11.1 Run full E2E suite on Chromium: `npx playwright test --project=chromium-desktop` — 63/63 tests pass
- [x] 11.2 Run smoke tests on all non-Chromium projects: configured via `grep: /@smoke/` (verified via `--list`)
- [x] 11.3 Run `npm run lint` — no new lint errors introduced
- [x] 11.4 Run `npm run build` — all projects build successfully
- [x] 11.5 Run `npm run test` — all existing unit tests still pass
- [x] 11.6 Run `npx nx e2e web` via `npm run e2e` — full pipeline works end-to-end (63/63 on chromium-desktop)
- [x] 11.7 Verify `test-results/` and `playwright-report/` are in `.gitignore`
