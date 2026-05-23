## Context

eco-metrics earth currently has zero E2E testing. The CI pipeline runs lint, typecheck, build, and unit tests (194 tests all passing), but there is no validation of real browser interactions. The web app has 11 eco-category pages, a home page, a 404 page, and SEO infrastructure (sitemap, robots.txt, manifest, metadata) -- all untested from a user perspective. The API has a health endpoint and mock validation endpoints, also untested from a network perspective.

The project is an NX v22 monorepo with `apps/web` (Next.js 16+, port 3000) and `apps/api` (NestJS, port 3001). Testing uses Jest 30 with Testing Library. No E2E framework exists.

## Goals / Non-Goals

**Goals:**
- Scaffold a new NX E2E project `apps/web-e2e` using `@nx/playwright`
- Configure Playwright with 5 browser projects (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)
- Write E2E tests for: navigation, SEO, API health, security headers, accessibility, PWA manifest, and mobile-specific behaviors
- Integrate E2E into CI as the final gate in the existing workflow
- Enable traces on failure for debugging
- Auto-start dev servers via Playwright's `webServer` config (no Caddy dependency in CI)
- Zero modifications to `apps/web/`, `apps/api/`, or `packages/shared/` source code

**Non-Goals:**
- Visual regression/screenshot testing (Playwright snapshots)
- API-to-UI integration tests (blocked on P2 eco-category modules)
- Performance/lighthouse testing
- Production URL testing (localhost only)
- HTML reporter
- Tests for future eco-category data (P2)

## Decisions

### Decision 1: `@nx/playwright` over vanilla Playwright

**Choice:** Use `@nx/playwright@22.7.3` (the NX plugin wrapper).

**Rationale:**
- The project already uses `@nx/jest`, `@nx/next`, `@nx/nest`, `@nx/react`, `@nx/node`, `@nx/js`, `@nx/webpack` -- adding `@nx/playwright` is consistent with the existing toolchain
- The generator `nx g @nx/playwright:project` creates the project, config, and tsconfig in one command
- Inferred targets mean `nx e2e web-e2e` works automatically without `project.json` edits
- `nx affected --target=e2e` integrates with NX's task graph
- NX Cloud caching works for E2E results (if enabled)
- The generated `playwright.config.ts` is standard Playwright -- the NX plugin adds `webServer` + `outputDir` support, not abstraction

**Alternatives considered:**
- **Vanilla Playwright**: More portable but requires manual `webServer` config, CI setup, and custom npm scripts. No NX caching or affected detection. Rejected because the project is already committed to NX and the benefits outweigh the tiny abstraction overhead.

### Decision 2: Separate NX project (`apps/web-e2e/`) vs in-tree E2E

**Choice:** Create a new NX project `apps/web-e2e/` at the monorepo root level.

**Rationale:**
- Standard NX convention (same as `@nx/cypress` would create `apps/web-e2e/`)
- Clean dependency separation: Playwright deps don't pollute `apps/web/package.json`
- NX targets are inferred automatically by the plugin
- The project can depend on `apps/web` for its dev server without circular dependencies

**Alternatives considered:**
- **In-tree (`apps/web/e2e/`)**: Simpler structure but Playwright deps go into the web app's `package.json`, mixing frontend and E2E concerns. Rejected for violating the monorepo separation of concerns.
- **Root-level (`e2e/`)**: Could test both web + API from a single project. Rejected because `@nx/playwright:project` creates standard `apps/<name>-e2e/` projects, and NX's task graph works best when E2E projects are associated with a specific app.

### Decision 3: `webServer` auto-start using `npm run dev`

**Choice:** Playwright's `webServer` configuration starts `npm run dev` (which runs `nx run-many --targets=dev,serve --all --parallel`). Base URL: `http://localhost:3000` for web, `http://localhost:3001` for API.

**Rationale:**
- `npm run dev` works anywhere (local + CI) without Caddy or special setup
- The `dev:local` script (with Caddy + `https://eco-metrics.localhost`) requires Caddy installation, `setcap`, and `caddy trust` -- not portable to CI
- Users who run `dev:local` separately can use Playwright's `reuseExistingServer: true` and override `BASE_URL` via environment variable

**Alternatives considered:**
- **`dev:local` as webServer**: Would work locally but breaks in CI. Rejected for portability.
- **Separate `nx serve web` + `nx serve api`**: More granular but `npm run dev` already starts both. No benefit.

### Decision 4: Multi-browser strategy (5 projects, smoke vs full)

**Choice:** Configure 5 Playwright projects. Full test suite runs on Chromium desktop. Firefox, WebKit, Mobile Chrome, and Mobile Safari run only smoke tests (`@smoke` tag).

**Rationale:**
- Chromium is the fastest and most reliable for development iteration
- Full cross-browser coverage in CI would be too slow (~15+ minutes with 11 categories x all tests x 5 browsers)
- `@smoke` tag reduces CI time by running only critical-path tests (home, health, 1 category, SEO) on non-Chromium browsers
- Mobile projects use device emulation (Pixel 5 for Chrome, iPhone 12 for Safari) to validate mobile-specific behavior (MobileHeader, bottom nav, scroll)

**Alternatives considered:**
- **All browsers full suite**: Too slow for CI; rejected on performance grounds.
- **Chromium only**: Cheapest but misses cross-browser and mobile bugs. Rejected because the mobile nav is structurally different (bottom bar vs sidebar).
- **Separate mobile test file**: Cleaner organization, but Playwright's project-based viewports achieve the same with less code.

**Browser project configuration:**

| Project | Viewport / Device | Suite | NPM script alias |
|---------|-------------------|-------|------------------|
| `chromium-desktop` | 1280x720 | Full | Default |
| `firefox-desktop` | 1280x720 | @smoke | `nx e2e web-e2e --project=firefox-desktop` |
| `webkit-desktop` | 1280x720 | @smoke | `nx e2e web-e2e --project=webkit-desktop` |
| `mobile-chrome` | Pixel 5 (393x851) | @smoke | `nx e2e web-e2e --project=mobile-chrome` |
| `mobile-safari` | iPhone 12 (390x844) | @smoke | `nx e2e web-e2e --project=mobile-safari` |

### Decision 5: Test file organization

**Choice:** Organize tests by concern, not by page.

```
apps/web-e2e/e2e/
  navigation.spec.ts       -- Home, 11 categories, 404, desktop + mobile nav
  seo.spec.ts              -- Trailing slashes, meta tags, OG, canonical, sitemap, robots.txt
  security-headers.spec.ts -- CSP, X-Frame-Options, etc.
  api-health.spec.ts        -- /api/v1/health, 404, CORS
  a11y.spec.ts             -- axe-core audits on home + categories
  pwa-manifest.spec.ts     -- manifest.webmanifest validation
  mobile-navigation.spec.ts -- Mobile-specific: header, bottom bar, scroll
```

**Rationale:**
- Each spec file maps to a capability in the proposal
- A failing test immediately tells you which concern broke (e.g., "SEO" not "the air-quality page")
- Test files are small and focused
- Shared page objects and fixtures extracted to `e2e/fixtures/` or `e2e/utils/`

**Alternatives considered:**
- **Per-page organization (`air-quality.spec.ts`, `co2-emissions.spec.ts`)**: Simpler to locate page-specific tests but duplicates cross-cutting concerns and makes SEO regression testing scattered across 11 files.

### Decision 6: Page Object Model (lightweight)

**Choice:** Extract reusable selectors and actions into a `BasePage` object and a `categoryPage(categorySlug)` factory. Keep it lightweight -- no full POM framework.

**Rationale:**
- The app has a consistent structure: every category page has the same layout, just different content
- A `categoryPage(slug)` factory returns `{ url, title, description, heading, iconTestId }` for any category
- DRY -- 11 categories tested with a loop, not 11 copy-pasted tests
- Playwright's built-in locators (`page.getByRole`, `page.getByTestId`) already provide strong selectors

**Page objects:**

```typescript
// e2e/utils/pages.ts
export const homePage = {
  url: '/',
  title: 'eco-metrics earth',
  heading: 'Environmental Metrics Dashboard',
};

export function categoryPage(slug: EcoCategory) {
  const title = getCategoryTitle(slug);
  return {
    url: `/${slug}/`,
    title: `${title} — eco-metrics earth`,
    heading: title,
    iconTestId: `category-icon-${slug}`,
  };
}
```

### Decision 7: Selector strategy

**Choice:** Prefer `getByRole` (accessible) > `getByTestId` (explicit) > `getByText` (content-based) > `locator('css')` (last resort).

**Rationale:**
- `getByRole` tests what assistive technology "sees" -- aligns with a11y goals
- `data-testid` is already used in some components (icons). Encouraged for icons and structural elements that lack semantic roles
- CSS selectors are fragile (class changes in Tailwind break them) -- use only when no semantic alternative exists
- The project's existing `data-testid` attributes on icon wrappers will be reused

### Decision 8: CI integration position

**Choice:** Add E2E as the final step in the existing `ci.yml` workflow, after the `Test` step. E2E failure blocks the PR.

**Rationale:**
- Lint -> Typecheck -> Build -> Unit Tests -> **E2E** is the standard quality gate order (fastest/simplest first, slowest/integration-heavy last)
- E2E tests depend on the built app being available (Playwright's `webServer` starts `npm run dev`, which starts the dev servers, not the production build -- but this is acceptable because Playwright tests should validate behavior, not production build artifacts, in CI)
- Keeping it in the same job keeps the workflow simple (one job, one set of artifacts)
- If E2E grows too slow (>3-5 min), it can be extracted to a separate job triggered by the CI job's success

**Alternatives considered:**
- **Separate E2E workflow**: Better isolation, parallel execution. Currently overkill for ~30-60s of tests. Revisit when E2E runtime exceeds 3 minutes.
- **CD (post-deploy)**: Catches bugs too late. E2E should block the merge, not the deploy. Rejected.

### Decision 9: Dependencies and version pinning

**Choice:** Install with `--save-exact`, per AGENTS.md policy.

| Package | Version | Location |
|---------|---------|----------|
| `@nx/playwright` | 22.7.3 | root devDependencies |
| `@playwright/test` | 1.60.0 | root devDependencies |
| `@axe-core/playwright` | 4.10.1 | root devDependencies |

**Rationale:**
- All packages go to root `devDependencies` (NX convention for monorepo tooling)
- Versions pinned exactly (no `^`/`~`) per AGENTS.md
- `@nx/playwright@22.7.3` matches the existing NX plugins (`@nx/jest@22.7.2`, `@nx/next@22.7.2`, etc.) -- 22.7.3 is the latest patch in the 22.7.x line
- `@axe-core/playwright@4.10.1` is the latest stable version compatible with Playwright 1.60

### Decision 10: Traces and artifacts

**Choice:** `trace: 'retain-on-failure'` in `playwright.config.ts`. No HTML reporter. Traces saved to `apps/web-e2e/test-results/`.

**Rationale:**
- `retain-on-failure` saves traces only for failing tests -- zero overhead on passing runs, instant debugging when something breaks
- Traces include DOM snapshots, network requests, and screenshots -- sufficient for debugging
- No HTML reporter (per user preference -- simple terminal output is preferred at this stage)
- `test-results/` is already in `.gitignore` (standard Playwright behavior)

### Decision 11: Mobile testing approach

**Choice:** Create a dedicated `mobile-navigation.spec.ts` that uses `@smoke` tag and runs on `mobile-chrome` and `mobile-safari` projects. Mobile-specific page objects include viewport assertions.

**Mobile-specific test cases:**
- MobileHeader is visible at viewport < 768px (`page.getByTestId('mobile-header')`)
- MobileHeader contains logo and brand text
- Navbar renders as fixed bottom bar (not left sidebar)
- NavScrollContainer allows horizontal scrolling to reveal all categories
- Gradient fade affordances appear at scroll edges
- Clicking a bottom bar NavLink navigates to the correct category
- `aria-current="page"` updates on the active NavLink

## Risks / Trade-offs

- **[Risk] CI runtime increase:** Adding E2E to a CI job that currently runs in ~2-3 minutes could push it to ~5-6 minutes (Chromium only). **Mitigation:** Run only `chromium-desktop` in CI by default. Other browsers can be added later with a separate workflow.
- **[Risk] Playwright browser binaries in CI:** CI needs `npx playwright install --with-deps chromium` before running tests. **Mitigation:** Add this as a step in the CI workflow. The `--with-deps` flag installs system dependencies (libgtk, etc.) automatically. Estimated install time: ~15-30 seconds.
- **[Risk] Flaky tests from dev server timing:** Playwright's `webServer` config waits for the URL to respond, but the dev server might serve a blank page briefly during compilation. **Mitigation:** Use `waitUntil: 'networkidle'` on initial page navigation. Add explicit `page.waitForSelector('#main-content')` for critical assertions.
- **[Risk] `@axe-core/playwright` false positives:** axe-core can report violations that are not real issues (e.g., color contrast on brand elements). **Mitigation:** Start with `axe-core` in "collect" mode -- report violations but don't fail the test initially. After review, either fix legitimate issues or add axe-core `exclude` rules.
- **[Trade-off] No production build testing:** E2E tests run against the dev server, not the production build. Differences in behavior (e.g., Turbopack vs production webpack) could mean a bug passes E2E but fails in prod. **Mitigation:** The project's scope is currently limited to static pages with no complex data fetching -- behavior should be identical. Revisit when data fetching is introduced (P2).

## Open Questions

- **axe-core severity threshold:** Start with no violations at "critical" and "serious" levels. If there are pre-existing minor violations (e.g., color contrast), document them and create a follow-up task. Should the test fail on "moderate" violations too?
- **Nx Cloud caching for E2E:** Is Nx Cloud enabled for this project? If so, E2E cache hits could speed up CI significantly. If not, consider enabling it for the E2E target only.
- **Snapshot testing (future):** Should we reserve space in the test structure for visual snapshot tests later? (Answer: not needed now, the folder structure doesn't prevent adding them.)
