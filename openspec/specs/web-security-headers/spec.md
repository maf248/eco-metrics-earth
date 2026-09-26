# web-security-headers Specification

## Purpose

Defines the HTTP security headers and content security policy served by the Next.js web app.

## Requirements

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

#### Scenario: Any page response includes an extended Permissions-Policy

- **WHEN** a browser requests any page of the web app
- **THEN** the response includes `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=()`

#### Scenario: Any page response includes Cross-Origin-Opener-Policy

- **WHEN** a browser requests any page of the web app
- **THEN** the response includes `Cross-Origin-Opener-Policy: same-origin`

#### Scenario: Any page response includes Cross-Origin-Resource-Policy

- **WHEN** a browser requests any page of the web app
- **THEN** the response includes `Cross-Origin-Resource-Policy: same-origin`

### Requirement: Web app serves a Content-Security-Policy header

The Next.js web app SHALL serve a `Content-Security-Policy` header that restricts resource loading to self-hosted assets by default, while explicitly permitting Google Fonts, allowing inline styles and scripts required by Next.js App Router, and additionally constraining `<base>` tag rewriting, form submission targets, plugin/object embedding, nested browsing contexts, and insecure subresource loading. The CSP applied to production responses SHALL contain the following directives: `default-src 'self'`, `script-src 'self' 'unsafe-inline'` (with `'unsafe-eval'` additionally present only in development builds), `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, `font-src 'self' https://fonts.gstatic.com`, `img-src 'self' data: blob:`, `connect-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`, and `frame-src 'none'`. Production responses SHALL additionally contain `upgrade-insecure-requests`; development responses SHALL NOT contain it.

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

#### Scenario: CSP restricts the base URI

- **WHEN** an attacker-injected `<base href="https://evil.example">` tag is present in the page
- **THEN** the browser ignores the rewrite of relative URLs because `base-uri 'self'` only permits the document's own origin as the base URI

#### Scenario: CSP restricts form submission targets

- **WHEN** a form on the page attempts to submit to an external origin
- **THEN** the browser blocks the submission because `form-action 'self'` only permits same-origin form targets

#### Scenario: CSP blocks plugin/object embeds

- **WHEN** the page attempts to load content via `<object>`, `<embed>`, or `<applet>`
- **THEN** the browser blocks the load because `object-src 'none'` denies all such content

#### Scenario: CSP blocks nested browsing contexts

- **WHEN** the page attempts to embed an `<iframe>` or `<frame>` pointing to any origin
- **THEN** the browser blocks the nested frame because `frame-src 'none'` denies all nested browsing contexts

#### Scenario: CSP upgrades insecure subresource requests in production

- **WHEN** a production response is served and the page references a subresource via an `http://` URL
- **THEN** the browser rewrites the request to `https://` before sending it, because `upgrade-insecure-requests` is present in the production CSP

#### Scenario: CSP omits the upgrade directive in development

- **WHEN** the web app is served by the development server over `http://localhost`
- **THEN** the `Content-Security-Policy` header does NOT contain `upgrade-insecure-requests`, so local `http://` requests are never upgraded

### Requirement: Empty .env files are removed from git tracking

The repository SHALL NOT track `apps/api/.env` or `apps/web/.env.local` in git. These files MUST be removed from the git index while being preserved locally. The `.gitignore` MUST cover these patterns.

#### Scenario: .env files are not tracked after change

- **WHEN** `git status` is run after the change
- **THEN** `apps/api/.env` and `apps/web/.env.local` do not appear as tracked files

#### Scenario: .gitignore covers .env patterns

- **WHEN** a developer creates a non-empty `apps/api/.env`
- **THEN** `git status` shows it as untracked (ignored), not as a new file to stage
