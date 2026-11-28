# Tasks: add-web-analytics

Read `AGENTS.md` and `docs/design-system.md` before starting. Jest tests use `it(...)`, Playwright tests use `test(...)`; tag an E2E test `@smoke` only when its result can differ by browser engine or viewport. Tests must produce zero console errors and warnings.

## 1. Dependencies

- [x] 1.1 In `apps/web` run `npm install --save-exact @vercel/analytics @vercel/speed-insights` (workspace scope, latest versions). Verify both appear in `apps/web/package.json` with no `^` or `~`, and in neither the root `package.json` nor `apps/api/package.json`. (Spec: web-analytics, "Dependencies are pinned in the web app only")
- [x] 1.2 Read the installed packages in `node_modules/@vercel/analytics` and `node_modules/@vercel/speed-insights` and confirm that in production mode the script and the beacons use root-relative same-origin paths (`/_vercel/insights/*`, `/_vercel/speed-insights/*`, the per-project script path) and that `va.vercel-scripts.com` appears only in debug-mode or `dsn` code. If any production path uses another origin, STOP and report to the orchestrator; do not edit the CSP. (Spec: web-security-headers, "Analytics scripts load same-origin in production mode")

## 2. Decision helper

- [x] 2.1 Create `apps/web/src/lib/analyticsEnabled.ts` exporting `analyticsEnabled(env = process.env): boolean`, true only for `env.VERCEL_ENV === 'production'`. (Spec: web-analytics, "Analytics decision helper")
- [x] 2.2 Add `delete process.env.VERCEL_ENV;` to `apps/web/jest.setup.ts`, next to the Sentry DSN deletion, with a comment saying why.
- [x] 2.3 Create `apps/web/__tests__/lib/analyticsEnabled.test.ts` covering `production` (true), `preview`, `development`, empty string, an unknown value and `undefined` (false), plus the default argument reading `process.env` (set and restore the variable around the test). (Spec: web-analytics, the four helper scenarios)

## 3. Layout

- [x] 3.1 In `apps/web/src/app/layout.tsx`, import `Analytics` from `@vercel/analytics/next` and `SpeedInsights` from `@vercel/speed-insights/next`, and render `<Analytics />` and `<SpeedInsights sampleRate={0.5} />` inside `<body>` after the content wrapper, only when `analyticsEnabled()` is true. Keep every existing layout class and landmark untouched. (Spec: web-analytics, "Web Analytics and Speed Insights in the root layout")
- [x] 3.2 Extend `apps/web/__tests__/app/layout.test.tsx`: mock `@vercel/analytics/next` and `@vercel/speed-insights/next` with marker elements (the Speed Insights mock exposes its `sampleRate` prop); assert both render after the content wrapper with `VERCEL_ENV=production` and `sampleRate` is `0.5`, and that neither renders for `preview` and for unset. Restore `process.env.VERCEL_ENV` after each test. (Spec: web-analytics, the five layout scenarios)
- [x] 3.3 Run `npm run build`. If the prerender complains about the analytics components under `cacheComponents` (missing Suspense or uncached data), wrap the gated pair in `<Suspense fallback={null}>` and note it in the task report; never disable `cacheComponents`.

## 4. Privacy page

- [x] 4.1 Create `apps/web/src/app/privacy/page.tsx`: static server component, no `connection()`, no BFF import, wrapper and header classes as in `apps/web/src/app/data-sources/page.tsx`, `PAGE_TITLE_CLASS_NAME` on the `<h1>` "Privacy", `<h2>` sections (what the site stores on your device; usage measurement; errors and hosting; questions), `LINK_CLASS_NAME` and `target="_blank" rel="noopener noreferrer"` on the link to `https://github.com/maf248/eco-metrics-earth`, a fixed `PRIVACY_LAST_UPDATED` constant (`'2026-11-28'`, in `apps/web/src/lib/privacyPolicy.ts`) rendered with `formatUtcDate` inside `<time dateTime>`. Tokens only. Content exactly as listed in the spec requirement "Privacy page states only the facts that hold"; no compliance wording. (Spec: privacy-page, first two requirements)
- [x] 4.2 Export `metadata` from the page: title "Privacy", description, `alternates.canonical` = `${siteUrl()}/privacy/`, `openGraph` via `buildOpenGraph({ title, description, url })` and `twitter` via `buildTwitter({ title, description })`. No `robots`. (Spec: privacy-page, "Privacy page SEO")
- [x] 4.3 Create `apps/web/__tests__/app/privacy/page.test.tsx`: renders one `<h1>` "Privacy" and `<h2>` sections; describes, in generic terms, no cookies, a theme preference kept on the device, aggregate visit counts, sampled page speed, hosting logs and error reports, no data sold or used for ads, and names no provider or storage key; contains the repository link with `rel="noopener noreferrer"`; shows a `<time>` whose `dateTime` is the constant; text matches none of `/gdpr|compliant|legal advice/i`; metadata canonical ends with `/privacy/` and `openGraph.url` matches; Open Graph and Twitter images equal the shared `OG_IMAGE` (mirror `__tests__/app/data-sources/page.test.tsx`). (Spec: privacy-page scenarios)

## 5. Footer

- [x] 5.1 In `apps/web/src/components/Footer.tsx`, change the bottom line to `© 2026 eco-metrics earth · by maf248 · ` followed by `<Link href="/privacy/" className={LINK_CLASS_NAME}>Privacy</Link>`; add no size class, no new token, and nothing to the nav or the `$ cd` slot. (Spec: site-footer, "Footer content and styling")
- [x] 5.2 Update `apps/web/__tests__/components/Footer.test.tsx`: the "exactly one link" test becomes "exactly two links" (Data sources, `href` `/data-sources`; Privacy, `href` `/privacy`, trailing slash stripped by `next/link` in jsdom); the signature assertion expects `© 2026 eco-metrics earth · by maf248 · Privacy`; add a test that the Privacy link sits in the bottom line and carries `underline` and the focus ring classes, and one that `NAV_ITEMS` has no Privacy entry. Update any footer snapshot in `__tests__/components/__snapshots__/` with `npx nx test web -- --updateSnapshot` and review the `.snap` diff: only the footer line may change. (Spec: site-footer scenarios)
- [x] 5.3 Run `apps/web/__tests__/designTokens.test.ts` and confirm it passes with the changed footer and the new page.

## 6. Sitemap

- [x] 6.1 In `apps/web/src/app/sitemap.ts` add an entry `url: ${base}/privacy/`, `changeFrequency: 'yearly'`, `priority: 0.3`, no `lastModified`, after the data sources entry. (Spec: sitemap, "Sitemap includes the privacy page")
- [x] 6.2 Update `apps/web/__tests__/app/sitemap.test.ts`: the total length becomes `3 + LIVE_CATEGORIES.length`; add tests for the privacy entry (exactly one, frequency, priority) and that it has no `lastModified` even when every category date is known; keep the trailing-slash test passing. (Spec: sitemap scenarios)

## 7. CSP stays unchanged

- [x] 7.1 In `apps/web/__tests__/lib/contentSecurityPolicy.test.ts` add tests: the production policy without a DSN is unchanged (reuse the existing expected-policy constant), `connect-src` is exactly `'self'`, and for production and development, with and without a DSN, the policy contains none of `vercel-scripts.com`, `vercel-insights.com`, `vercel.com`. Do not modify `contentSecurityPolicy.ts`. (Spec: web-security-headers, first two scenarios)

## 8. E2E

- [x] 8.1 In `apps/web/e2e/utils/pages.ts` add a `privacyPage` object next to `dataSourcesPage` (url `/privacy/`, heading `Privacy`) following the same shape.
- [x] 8.2 In `apps/web/e2e/a11y.spec.ts` add an "Accessibility audit — privacy page" describe auditing `/privacy/` in the light and dark themes (untagged, like the data sources audit); add `privacyPage.url` to the `footerPages` list of the single-footer test. (Spec: privacy-page, "Axe audit")
- [x] 8.3 Add a test (new `apps/web/e2e/privacy.spec.ts`, or in `navigation.spec.ts` if it fits better) tagged `@smoke`: from `/`, click the footer "Privacy" link, expect URL `/privacy/` and the `<h1>` "Privacy" visible. Add one untagged test asserting the page content lists no cookies (visible text contains "no cookies"). (Spec: privacy-page, "Reached from the footer")
- [x] 8.4 In `apps/web/e2e/seo.spec.ts`: assert `/sitemap.xml` contains `<loc>http://localhost:3000/privacy/</loc>`; add `'/privacy/'` to the "should leave ... indexable" paths; add `/privacy/` to the canonical-link checks if that spec iterates a list of pages. Untagged. (Spec: privacy-page SEO, sitemap)
- [x] 8.5 Optional: in `apps/web/e2e/navigation.spec.ts` (or `privacy.spec.ts`) add a chromium-only test that loading `/` issues no request whose URL path starts with `/_vercel/` (collect `page.on('request')`). Untagged. (Spec: web-analytics, "Neither component renders locally, in Jest or in E2E")

## 9. Docs

- [x] 9.1 `AGENTS.md`: in the structure tree add the `app/privacy/` route mention to the `app/` line and `analyticsEnabled.ts` (Vercel Web Analytics and Speed Insights gate: `VERCEL_ENV === 'production'`) to the `lib/` list. Add a short "Web analytics" subsection next to "Error tracking (Sentry)": production-only, cookieless, CSP unchanged, no consent banner, the privacy page must be updated whenever a collector is added.
- [x] 9.2 `README.md`: check whether it lists routes, features or env vars that should mention analytics or `/privacy/`; update only if such a list exists. No `.env.example` change (no new variable; `VERCEL_ENV` is a Vercel system variable).
- [x] 9.3 `docs/deploy/vercel.md`: add a section "Web Analytics and Speed Insights": enable both in the project dashboard (Analytics tab, Speed Insights tab) as a manual step by the repository owner; production-only rendering via `VERCEL_ENV`; Hobby quotas (Web Analytics 50,000 events per month shared by the team, Speed Insights 10,000 events per rolling 30 days, sampled at 0.5 in code); going over only pauses collection (Speed Insights for at least 14 days) and never bills; a preview deployment promoted to production without a rebuild reports nothing; where to read the data. Close the section with one short, plain note: the project runs on the Vercel Hobby plan, which Vercel limits to personal, non-commercial use, so if the site is ever monetized (ads, sponsorships, paid features) the project must move to a paid plan (Pro) first.
- [x] 9.4 `docs/design-system.md`: update the "Site footer" bullet so it says the bottom line ends with a "Privacy" link (`LINK_CLASS_NAME` at the line's `text-xs` size) and that the footer has exactly two links. No other change.
- [x] 9.5 `ROADMAP.md` (Spanish): delete the analytics item from the "Producto" backlog; renumber every subsequent `Ixx` ID so the sequence has no gaps and update every cross-reference (status table, "Plan de Acción Sugerido", other items); in "Plan de Acción Sugerido" remove the step that pointed at the analytics item and leave the list with an explicit "sin pasos pendientes" line while keeping the passive TypeScript follow-up note; change the heading "Estado del Proyecto (27 Nov 2026)" to 28 Nov 2026 and keep "Última actualización: 28 Nov 2026"; add Analytics (Vercel Web Analytics sin cookies y Speed Insights muestreado al 50%, solo en producción, con página `/privacy/`) to the "Monitoreo" row of the status table. Search the repo outside `openspec/changes/archive/` for other references to the renumbered IDs (for example in `AGENTS.md`) and fix them. Do not rewrite archived changes.

## 10. Gates

- [x] 10.1 Run, in order, and fix until each exits clean with zero warnings: `npm run format:check`, `npm run lint`, `npm run build`, `npm run test` (web coverage stays at or above 80% statements, functions, lines and branches), `npm run e2e`. Check ports first: stop any user `next dev` on `:3000` only with the user's consent. Then run `npx openspec validate add-web-analytics --strict`.
