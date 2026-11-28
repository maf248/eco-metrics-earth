## ADDED Requirements

### Requirement: Web analytics adds no origin to the Content-Security-Policy

Enabling Vercel Web Analytics and Speed Insights SHALL NOT change the `Content-Security-Policy`. Both products load their script and send their beacons from the site's own origin on Vercel (root-relative paths), which `script-src 'self'` and `connect-src 'self'` already permit. The policy builder SHALL NOT gain any origin for them, in particular not `va.vercel-scripts.com`, `vitals.vercel-insights.com` or `cdn.vercel-insights.com`.

#### Scenario: Production policy is unchanged

- **WHEN** the CSP is built for production without a Sentry DSN
- **THEN** the result is exactly the policy that was served before analytics was added
- **AND** `connect-src` is exactly `'self'`

#### Scenario: No Vercel analytics host is allowed

- **WHEN** the CSP is built in production and in development, with and without a Sentry DSN
- **THEN** the result contains none of `vercel-scripts.com`, `vercel-insights.com` or `vercel.com`

#### Scenario: Analytics scripts load same-origin in production mode

- **GIVEN** the installed `@vercel/analytics` and `@vercel/speed-insights` packages
- **WHEN** their production-mode script and beacon URLs are inspected
- **THEN** every one is a root-relative path on the site's own origin, and `va.vercel-scripts.com` appears only in debug-mode or `dsn` code paths
