## ADDED Requirements

### Requirement: Web app serves HTTP security headers on all routes
The Next.js web app SHALL serve a set of HTTP security headers on every response via the `headers()` function in `next.config.ts`. These headers MUST be applied to all routes matching `'/(.*)'`.

#### Scenario: Any page response includes X-Frame-Options
- **WHEN** a browser requests any page of the web app
- **THEN** the response includes `X-Frame-Options: DENY`

#### Scenario: Any page response includes X-Content-Type-Options
- **WHEN** a browser requests any page of the web app
- **THEN** the response includes `X-Content-Type-Options: nosniff`

#### Scenario: Any page response includes Referrer-Policy
- **WHEN** a browser requests any page of the web app
- **THEN** the response includes `Referrer-Policy: strict-origin-when-cross-origin`

#### Scenario: Any page response includes Permissions-Policy
- **WHEN** a browser requests any page of the web app
- **THEN** the response includes `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Requirement: Web app serves a Content-Security-Policy header
The Next.js web app SHALL serve a `Content-Security-Policy` header that restricts resource loading to self-hosted assets by default, while explicitly permitting Google Fonts and allowing inline styles and scripts required by Next.js App Router.

#### Scenario: CSP prevents embedding in iframes
- **WHEN** a third-party site attempts to embed the web app in an `<iframe>`
- **THEN** the browser blocks the embed due to `frame-ancestors 'none'` in the CSP

#### Scenario: CSP allows self-hosted scripts and Next.js inline scripts
- **WHEN** the browser loads a page with Next.js hydration scripts
- **THEN** inline scripts are permitted via `script-src 'self' 'unsafe-inline'`

#### Scenario: CSP allows Google Fonts stylesheets and font files
- **WHEN** the page requests a stylesheet from `fonts.googleapis.com`
- **THEN** the browser loads it without CSP violation
- **WHEN** the page requests a font file from `fonts.gstatic.com`
- **THEN** the browser loads it without CSP violation

#### Scenario: CSP blocks resources from unknown origins
- **WHEN** a script or style attempts to load from an unallowed external origin
- **THEN** the browser blocks the resource and reports a CSP violation in the console

### Requirement: Empty .env files are removed from git tracking
The repository SHALL NOT track `apps/api/.env` or `apps/web/.env.local` in git. These files MUST be removed from the git index while being preserved locally. The `.gitignore` MUST cover these patterns.

#### Scenario: .env files are not tracked after change
- **WHEN** `git status` is run after the change
- **THEN** `apps/api/.env` and `apps/web/.env.local` do not appear as tracked files

#### Scenario: .gitignore covers .env patterns
- **WHEN** a developer creates a non-empty `apps/api/.env`
- **THEN** `git status` shows it as untracked (ignored), not as a new file to stage
