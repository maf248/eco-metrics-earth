## MODIFIED Requirements

### Requirement: Web app serves a Content-Security-Policy header

The Next.js web app SHALL serve a `Content-Security-Policy` header that restricts resource loading to self-hosted assets by default (the site loads no third-party stylesheets or fonts), allowing inline styles and scripts required by Next.js App Router, and additionally constraining `<base>` tag rewriting, form submission targets, plugin/object embedding, nested browsing contexts, and insecure subresource loading. The CSP applied to production responses SHALL contain the following directives: `default-src 'self'`, `script-src 'self' 'unsafe-inline'` (with `'unsafe-eval'` additionally present only in development builds), `style-src 'self' 'unsafe-inline'`, `font-src 'self'`, `img-src 'self' data: blob:`, `connect-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`, and `frame-src 'none'`. Production responses SHALL additionally contain `upgrade-insecure-requests`; development responses SHALL NOT contain it.

#### Scenario: CSP prevents embedding in iframes

- **WHEN** a third-party site attempts to embed the web app in an `<iframe>`
- **THEN** the browser blocks the embed due to `frame-ancestors 'none'` in the CSP

#### Scenario: CSP allows self-hosted scripts and Next.js inline scripts

- **WHEN** the browser loads a page with Next.js hydration scripts
- **THEN** inline scripts are permitted via `script-src 'self' 'unsafe-inline'`

#### Scenario: CSP allows Google Fonts stylesheets and font files

- **WHEN** the browser loads any page of the web app
- **THEN** the `Content-Security-Policy` header contains `style-src 'self' 'unsafe-inline'` and `font-src 'self'`
- **AND** the header does not reference `fonts.googleapis.com` or `fonts.gstatic.com`, so Google Fonts stylesheets and font files are no longer permitted (the site self-hosts every asset it loads)

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
