# Proposal: add-web-analytics

## Why

The site has no usage metrics at all. The roadmap (which categories to deepen, which new ones to add, whether a language other than English is worth the cost) is prioritised by guesswork. Cookieless, aggregate analytics on the Vercel platform the web app already runs on gives real data (which pages are visited, where visitors come from, how fast pages feel) without cookies, without storing anything on the visitor's device and without a new vendor.

Collecting usage data also calls for a short, honest statement of what the site collects. This change therefore adds a small `/privacy/` page and one discreet footer link to it.

## Goals

- Add **Vercel Web Analytics** (`@vercel/analytics`) to `apps/web`: aggregate page views, referrers, country, browser/OS/device. Cookieless.
- Add **Vercel Speed Insights** (`@vercel/speed-insights`) to `apps/web`, with `sampleRate={0.5}` so a Hobby plan stays inside its 10,000 events per rolling 30 days.
- Render both components **only on a Vercel production deployment** (`VERCEL_ENV === 'production'`), decided by a small pure helper that is unit-testable. Local development, Jest, E2E and preview deployments render neither.
- Keep the **Content-Security-Policy unchanged**: both scripts and their beacons are same-origin on Vercel and covered by `'self'`. A test pins that.
- Add a static, short **`/privacy/` page** that states what is and is not collected, in plain English, using only facts that hold today.
- Add a single, discreet **"Privacy" link** to the copyright line of the footer.
- Record the decision **not to show a consent banner**, with the reasoning, in `design.md`.
- Update docs in the same change: `AGENTS.md` structure tree, `docs/deploy/vercel.md` (enabling both products in the dashboard, Hobby quotas and pause behaviour), `docs/design-system.md` footer description, `ROADMAP.md` (close the analytics item, renumber, status table).

## Non-Goals

- No custom events (not available on the Hobby plan), no UTM or campaign tracking, no goals or funnels.
- No dashboards, no log or analytics drains, no export pipeline, no alternative provider (Cloudflare Web Analytics, Plausible, etc.).
- No consent banner, cookie notice or preference centre.
- No change to the API app (`apps/api`), the shared package or any BFF contract.
- No new CSP origin and no CSP code change.
- No new environment variable: `VERCEL_ENV` is a Vercel system variable.
- No analytics in preview deployments, local development, Jest or E2E.
- No entry for Privacy in the main navigation, `NAV_ITEMS` or the `$ cd data-sources/` footer slot.
- No legal claims beyond the facts listed on the page: no "GDPR compliant" or similar wording, no legal-advice tone.
- No change to Sentry configuration; the privacy page only describes it.

## Impact

- **New dependencies** (exact versions, `apps/web/package.json` only): `@vercel/analytics`, `@vercel/speed-insights`.
- **New files**: `apps/web/src/lib/analyticsEnabled.ts`, `apps/web/src/app/privacy/page.tsx`, and their tests.
- **Changed files**: `apps/web/src/app/layout.tsx` (two components, production only), `apps/web/src/components/Footer.tsx` (one link), `apps/web/src/app/sitemap.ts` (one entry), `apps/web/jest.setup.ts` (isolate `VERCEL_ENV`), existing unit and E2E tests that count footer links or sitemap entries, plus the docs listed above.
- **Capabilities**: `web-analytics` (ADDED), `privacy-page` (ADDED), `site-footer` (MODIFIED), `sitemap` (MODIFIED), `web-security-headers` (ADDED requirement).
- **Manual step outside the repo**: the repository owner enables Web Analytics and Speed Insights for the project in the Vercel dashboard (documented in `docs/deploy/vercel.md`). Until enabled, the scripts 404 on production and the site works unchanged.
- **Runtime behaviour on production**: two small same-origin scripts load after hydration; no visible UI change except the footer link.
