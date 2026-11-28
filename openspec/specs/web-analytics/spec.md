# web-analytics Specification

## Purpose

Cookieless, production-only usage analytics for the web app.

## Requirements

### Requirement: Analytics decision helper

`apps/web/src/lib/analyticsEnabled.ts` SHALL export a pure function `analyticsEnabled(env)` that returns `true` only when `env.VERCEL_ENV === 'production'`, and `false` for every other value (`'preview'`, `'development'`, an empty string, any unknown string, `undefined`). It SHALL default its argument to `process.env` and SHALL read no other variable.

#### Scenario: Vercel production enables analytics

- **GIVEN** `VERCEL_ENV` is `production`
- **WHEN** `analyticsEnabled` is called
- **THEN** it returns `true`

#### Scenario: Vercel preview does not enable analytics

- **GIVEN** `VERCEL_ENV` is `preview`
- **WHEN** `analyticsEnabled` is called
- **THEN** it returns `false`

#### Scenario: Vercel development does not enable analytics

- **GIVEN** `VERCEL_ENV` is `development`
- **WHEN** `analyticsEnabled` is called
- **THEN** it returns `false`

#### Scenario: Outside Vercel analytics stay off

- **GIVEN** `VERCEL_ENV` is unset, empty or an unknown value
- **WHEN** `analyticsEnabled` is called
- **THEN** it returns `false`

### Requirement: Web Analytics and Speed Insights in the root layout

The root layout (`apps/web/src/app/layout.tsx`, a server component) SHALL render `<Analytics />` from `@vercel/analytics/next` and `<SpeedInsights sampleRate={0.5} />` from `@vercel/speed-insights/next` inside `<body>`, after the content wrapper, if and only if `analyticsEnabled()` returns `true`. Otherwise it SHALL render neither, so no script and no `/_vercel/` request is produced.

#### Scenario: Both components render in production

- **GIVEN** `VERCEL_ENV` is `production`
- **WHEN** the root layout is rendered
- **THEN** the output contains the Web Analytics component and the Speed Insights component
- **AND** both are after the content wrapper, inside `<body>`

#### Scenario: Speed Insights is sampled at 50 percent

- **GIVEN** `VERCEL_ENV` is `production`
- **WHEN** the root layout is rendered
- **THEN** the Speed Insights component receives `sampleRate` equal to `0.5`

#### Scenario: Neither component renders on a preview deployment

- **GIVEN** `VERCEL_ENV` is `preview`
- **WHEN** the root layout is rendered
- **THEN** neither the Web Analytics nor the Speed Insights component is rendered

#### Scenario: Neither component renders locally, in Jest or in E2E

- **GIVEN** `VERCEL_ENV` is unset
- **WHEN** the root layout is rendered
- **THEN** neither component is rendered
- **AND** no `/_vercel/insights/*`, `/_vercel/speed-insights/*` or analytics script request is made, so the console-error collection of the E2E specs sees no 404

### Requirement: Analytics packages are pinned in the web app

`@vercel/analytics` and `@vercel/speed-insights` SHALL be pinned to exact versions in `apps/web/package.json` and SHALL NOT be added to the root `package.json`.

#### Scenario: Dependencies are pinned in the web app only

- **WHEN** `apps/web/package.json` and the root `package.json` are read
- **THEN** `@vercel/analytics` and `@vercel/speed-insights` appear in `apps/web/package.json` with exact versions (no `^` or `~`)
- **AND** neither appears in the root `package.json`

### Requirement: Analytics is cookieless and stores nothing on the device

Web Analytics and Speed Insights SHALL NOT set cookies and SHALL NOT write to `localStorage`, `sessionStorage` or IndexedDB on behalf of analytics. The only value the site keeps on the device remains the theme preference (`eco-metrics-theme`). The site SHALL NOT show a consent banner.

#### Scenario: No cookie after a production-mode visit

- **GIVEN** a page rendered with both components enabled
- **WHEN** the visit completes
- **THEN** `document.cookie` is empty and the only `localStorage` key is `eco-metrics-theme` (when the visitor used the theme toggle)

#### Scenario: No consent banner

- **WHEN** any page is rendered, with analytics enabled or not
- **THEN** it contains no cookie or consent banner and no dialog asking for analytics consent
