# Design: add-web-analytics

## Technical approach

### Components in the root layout

`apps/web/src/app/layout.tsx` is a server component. After the `ThemeProvider` tree, still inside `<body>`, it renders:

```tsx
{
  analyticsEnabled() && (
    <>
      <Analytics />
      <SpeedInsights sampleRate={0.5} />
    </>
  );
}
```

with `Analytics` from `@vercel/analytics/next` and `SpeedInsights` from `@vercel/speed-insights/next` (the `/next` entry points wrap the framework-agnostic ones and read the route through Next hooks). Both are client components, so importing them into the server layout needs no `'use client'` wrapper of ours. Placing them after the content keeps them out of the visual and accessibility tree (they render no DOM of their own) and makes their scripts load after the page.

### The decision helper

`apps/web/src/lib/analyticsEnabled.ts`:

```ts
export function analyticsEnabled(env: { VERCEL_ENV?: string } = process.env): boolean {
  return env.VERCEL_ENV === 'production';
}
```

Pure, one variable, unit-testable without rendering. The layout test mocks the two `/next` modules and toggles `process.env.VERCEL_ENV`.

### Why `VERCEL_ENV` is available where the layout runs

`VERCEL_ENV` is a Vercel **system environment variable** exposed to both the build and the runtime (`production`, `preview` or `development`); it needs no entry in the dashboard and no `NEXT_PUBLIC_` prefix. The layout is a server component and is prerendered at build time (the app uses `cacheComponents`), so the check runs during `next build` on Vercel, where `VERCEL_ENV` is already set, and its result is frozen into the static HTML shell. At request time (any dynamic page) `process.env.VERCEL_ENV` is also set. The rendered output therefore does not depend on the visitor.

`apps/web/next.config.ts` already uses the same variable for the Sentry environment (`NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.VERCEL_ENV ?? 'development'`). This change reuses the same signal and the same meaning, and does not inline it through `env`: the decision stays on the server, so no flag reaches the browser bundle.

Consequence to document: a build is bound to its `VERCEL_ENV`. A preview deployment later promoted to production without a rebuild keeps `preview` and would not report analytics. The project's flow (merge to `main`, build as production, held by Deployment Checks) is unaffected; this is noted in `docs/deploy/vercel.md`.

### Outside Vercel

Locally (`next dev`, `next start`, Jest, Playwright), `VERCEL_ENV` is unset, so nothing renders. This matters beyond tidiness: the scripts are served by the Vercel platform (`/_vercel/insights/*`, `/_vercel/speed-insights/*`, and a per-project script path), which does not exist outside it. Rendering the components there would 404, and the E2E specs fail on collected console errors (`collectErrors`). `jest.setup.ts` deletes `VERCEL_ENV` (as it already does for the Sentry DSN) so a developer's shell cannot leak it into tests.

### CSP stays unchanged

On Vercel both products serve their script and receive their beacons on the site's own origin (root-relative paths), covered by `script-src 'self'` and `connect-src 'self'` in `apps/web/src/lib/contentSecurityPolicy.ts`. No code change there. `va.vercel-scripts.com` is used only by the debug builds the packages pick outside production, which this change never renders, or when a `dsn` is configured, which only applies to hosting outside Vercel; the first production deploy is checked for CSP violations in the browser console (`docs/deploy/vercel.md`). `@coder` confirms this by reading the installed packages (task list) and adds a test to `contentSecurityPolicy.test.ts` that pins the unchanged policy and rejects any `vercel` host. If the installed versions turn out to load from another origin, that is a stop-and-ask point, not a silent CSP widening.

### Speed Insights sampling

Hobby includes 10,000 Speed Insights events per rolling 30 days, and each page view can emit several Web Vitals events. `sampleRate={0.5}` halves consumption. Going over the quota only pauses collection (at least 14 days); it never bills.

### Web Analytics quota and preview deployments

Hobby Web Analytics includes 50,000 events per month shared by the team. Preview deployments of `develop` would spend it on non-visitor traffic, so analytics are production-only.

### No consent banner

The site sets no cookies and writes nothing to the visitor's device for analytics: Web Analytics identifies a visit by a daily-resetting hash of the request and Speed Insights does not identify anyone. The only stored value is the theme preference, which is functional, stays on the device and is never transmitted. With nothing stored or read on the device for measurement and no cross-day or cross-site identification, there is no consent to collect, so a banner would only add friction and an interactive element to every page. The privacy page explains the practice instead. This is a product decision about what the site actually does, not a legal opinion; if a future change adds cookies, custom events with identifiers or a third-party script, the decision must be revisited.

### Privacy page

`apps/web/src/app/privacy/page.tsx`, a static server component without `connection()` or BFF reads (unlike `data-sources`), prerendered at build. It copies the data sources page's wrapper and header classes, `PAGE_TITLE_CLASS_NAME` for the `<h1>`, `text-2xl font-semibold text-fg` for `<h2>`, `text-fg-body` for paragraphs and `LINK_CLASS_NAME` for the repository link. Sections: "On your device", "What is measured" (visit counts, sampled page speed, hosting logs and error reports), "Questions". The copy stays generic: it names no service provider and no storage key, so it describes practices rather than vendors and does not drift when one changes. It takes its date from a fixed `PRIVACY_LAST_UPDATED` constant (`'2026-11-28'`, in `apps/web/src/lib/privacyPolicy.ts`) shown with `formatUtcDate`, to be bumped by hand whenever the practices change. Metadata uses `buildOpenGraph` and `buildTwitter` with a canonical `siteUrl() + '/privacy/'`.

The sitemap entry (`changeFrequency: 'yearly'`, `priority: 0.3`) omits `lastModified`: the sitemap rule is that a date is a data date or nothing, and a hand-bumped constant can drift from the file's real history.

### Footer link

`Footer.tsx` appends `·` and a `Link href="/privacy/"` with `LINK_CLASS_NAME` to the bottom line (`text-xs text-fg-muted`). The link inherits `text-xs`; `LINK_CLASS_NAME` supplies the accent color, underline and focus ring, so no new class, token or presentation pattern appears. Accent on `text-xs` passes the same contrast the existing links do. The "Privacy" entry is not added to `NAV_ITEMS`, the navbar or the `$ cd` slot. `docs/design-system.md` gets a one-sentence update to its footer description, since the footer's content changes; no new presentation decision is made.

### File structure changes

```
apps/web/
├── package.json                      # + @vercel/analytics, @vercel/speed-insights (exact)
├── jest.setup.ts                     # delete process.env.VERCEL_ENV
├── src/
│   ├── app/
│   │   ├── layout.tsx                # + gated <Analytics /> and <SpeedInsights />
│   │   ├── privacy/page.tsx          # new
│   │   └── sitemap.ts                # + privacy entry
│   ├── components/Footer.tsx         # + Privacy link
│   └── lib/analyticsEnabled.ts       # new
└── __tests__/ ...                    # see tasks
```

## Alternatives considered

- **Gate on `NODE_ENV === 'production'`.** Rejected: `next build` and `next start` locally, and the E2E build, are `production` too, and previews are `production` builds. Only `VERCEL_ENV` separates Vercel production from previews.
- **A custom `NEXT_PUBLIC_ANALYTICS` flag in the dashboard.** Rejected: a new variable to remember and to keep in sync per environment, for information `VERCEL_ENV` already carries.
- **Use the package's `beforeSend` or `mode` props instead of not rendering.** Rejected: `mode="production"` still injects the script and requests it; `beforeSend` filters events after the script has loaded. Not rendering is the only way to produce zero requests.
- **Analytics in every Vercel environment.** Rejected: previews would consume the shared 50,000-event quota.
- **Another provider (Cloudflare Web Analytics, Plausible, self-hosted).** Out of scope by decision: new origin, new CSP entry and a new vendor, where Vercel needs none.
- **A consent banner.** Rejected, see above.
- **Full Speed Insights sampling.** Rejected: ~2x quota use on Hobby for no extra insight at this traffic level; the rate is a single constant to raise later.
- **Privacy link in the navigation or the `$ cd` slot.** Rejected by explicit request: it must stay small and discreet.

## Risk assessment

| Risk                                                                                                                                               | Mitigation                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quota exceeded: collection pauses for at least 14 days on Hobby                                                                                    | Sampling at 0.5, production only; overage never bills and never affects the site. Documented in `docs/deploy/vercel.md`.                                                                                                                       |
| Products not enabled in the dashboard: script requests 404 on production and show console errors                                                   | Documented as a manual step before or right after the first production deploy; the site itself keeps working. Enabling is a one-click action per product.                                                                                      |
| `<Analytics />` or `<SpeedInsights />` reads route hooks in a `cacheComponents` layout and breaks the prerender (uncached data / missing Suspense) | `npm run build` is a gate. The `/next` entries wrap their hook use in `Suspense`; if the build still complains, wrap the pair in a `<Suspense fallback={null}>` in the layout and say so in the task report. Do not disable `cacheComponents`. |
| A preview build promoted to production loses analytics                                                                                             | Documented; the normal `main` flow rebuilds as production.                                                                                                                                                                                     |
| The installed package versions load from a host not covered by `'self'`                                                                            | Coder reads `node_modules` after install and stops to ask before touching the CSP. A CSP test pins the unchanged policy.                                                                                                                       |
| Privacy page drifts from reality (new provider, new storage)                                                                                       | The page carries a "Last updated" date; the spec lists the facts; revisiting is part of any change that adds a collector.                                                                                                                      |
| Test or E2E noise from the scripts                                                                                                                 | Nothing renders without `VERCEL_ENV=production`; `jest.setup.ts` removes the variable.                                                                                                                                                         |
| Footer tests and the sitemap count break                                                                                                           | Listed explicitly in the tasks: footer "exactly one link" becomes two; sitemap length gains one.                                                                                                                                               |
