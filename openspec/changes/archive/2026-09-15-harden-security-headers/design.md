# Design: Harden Security Headers

## Technical approach

All changes are confined to the single `headers()` function in `apps/web/next.config.ts`, which returns one entry (`source: '/(.*)'`) applied to every route. No middleware, no route handlers, and no additional `headers()` entries are introduced.

### CSP additions

The existing `csp` array (joined with `'; '`) gains five new string entries, appended after the current ones:

- `base-uri 'self'` — `default-src 'self'` does not govern the `<base>` element; without this directive an injected `<base href="https://evil.example">` tag would silently rewrite the resolution of every relative URL on the page (links, form actions, script/img src that are relative). This closes that gap.
- `form-action 'self'` — `default-src` also does not govern form submission targets. Without this, an injected `<form action="https://evil.example">` (e.g. via a markup injection that CSP's `script-src` alone wouldn't stop) could exfiltrate form data to an external origin.
- `object-src 'none'` — tightens from the `default-src 'self'` fallback. The site does not use `<object>`/`<embed>`/`<applet>`, so this is fully denied rather than left at `'self'`.
- `frame-src 'none'` — tightens from the `default-src 'self'` fallback. The site embeds no iframes anywhere, so nested browsing contexts are fully denied. This is distinct from `frame-ancestors 'none'` (already present), which controls whether *this* site can be framed by others; `frame-src` controls whether *this* site can frame others.
- `upgrade-insecure-requests` — **production only**, appended via the existing `isDev` flag (e.g. `...(isDev ? [] : ['upgrade-insecure-requests'])`). Included as defensive hardening. **This directive is a no-op today**: the site has no `http://` subresources to upgrade (all first-party assets are same-origin/HTTPS and the only third-party origins, `fonts.googleapis.com`/`fonts.gstatic.com`, are HTTPS-only). It is added proactively so that if an `http://` reference is ever introduced by mistake (e.g. a pasted link, a misconfigured CDN URL), the browser silently upgrades it to HTTPS instead of it failing or downgrading.

  It is gated to production because the local dev server is served over `http://localhost:3000`. Browsers are specified to exempt loopback hosts from the upgrade, but the directive has no value in dev and gating it removes any chance of dev-server friction at the cost of one line — reusing the `isDev` pattern the file already established for `'unsafe-eval'`.

The `isDev` branch that toggles `'unsafe-eval'` in `script-src` is untouched — it is orthogonal to these additions and must not be modified. This change introduces a *second*, independent use of the same `isDev` flag for `upgrade-insecure-requests`.

### New headers

- `Cross-Origin-Opener-Policy: same-origin` (COOP) — isolates the page's browsing context group from cross-origin windows, mitigating cross-origin attacks like Spectre-style side-channel and `window.opener` reference leaks.
- `Cross-Origin-Resource-Policy: same-origin` (CORP) — instructs browsers to block cross-origin `no-cors` loads of this site's resources, protecting against speculative side-channel attacks (e.g. Spectre) that read resource contents into an attacker's origin.

Both are added as new entries in the existing `headers` array of the single `/(.*)` rule — no new `headers()` entry, no per-path exceptions.

### Permissions-Policy extension

The existing value:

```
camera=(), microphone=(), geolocation=()
```

becomes:

```
camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=()
```

Each new feature is denied to all origins (empty allowlist `()`), consistent with the existing entries. This is a pure extension of the existing header string; the header key and its existing three feature denials are unchanged.

## Risk assessment

### COOP `same-origin` — future risk (must be recorded, not resolved now)

`same-origin` is zero-risk for this site **today** because it has no popup-based flows (no OAuth popup login, no popup-based payment flow). `same-origin` fully cuts `window.postMessage`/`window.opener` communication with any popup or window opened cross-origin, even ones the site itself opens.

**If a popup-based flow is added in the future** (e.g. OAuth login via popup, a popup payment provider), `same-origin` will silently break the `postMessage` handshake between the opener and the popup, because the popup will no longer share a browsing context group with the opener. At that point, the value must be relaxed to `same-origin-allow-popups`, which preserves the isolation benefits for direct cross-origin navigation while allowing the opener to retain a working (if partially restricted) reference to popups it opens.

This is a known, accepted forward-looking risk — no mitigation is implemented now because no such flow exists in the codebase today.

### CORP `same-origin` — does not break social previews

A natural concern is whether CORP blocks social media link-preview crawlers (Slack, Discord, Twitter/X, Facebook) or Google's Image indexing from fetching the site's OG/Twitter preview image (`/icons/eco-metrics-earth.svg`, referenced from `apps/web/src/app/layout.tsx`). It does not, because:

- CORP is a **browser-enforced** restriction on cross-origin *subresource* loads (i.e. it governs whether a web page loaded by a browser may embed another origin's resource via `<img>`, `<script>`, `fetch`, etc. in `no-cors` mode).
- Social crawlers and Googlebot-Image do not load the page in a browser and then sub-fetch the image cross-origin the way a webpage would; they perform a plain server-side HTTP GET request directly against the image URL. CORP is not evaluated in that path at all — there is no browser enforcing it.
- Rich-preview consumers like Slack, Discord, and Twitter/X additionally proxy the fetched image through their own CDN/service before ever rendering it to a user's browser, so even the eventual display to an end user does not involve a cross-origin browser fetch of the site's asset.

Conclusion: CORP `same-origin` protects the asset from being loaded cross-origin inside a third-party *webpage* rendered in a browser, while leaving direct, non-browser fetches (crawlers, social unfurlers) unaffected.

### SEO impact: none

Neither COOP nor CORP is a search ranking factor, and neither is evaluated by crawlers as part of indexing. Google's renderer (headless Chromium, used for JavaScript rendering during indexing) only loads the page's own same-origin resources to render it — CORP `same-origin` never blocks a page's own same-origin resource requests, only cross-origin ones from *other* pages. The CSP additions (`base-uri`, `form-action`, `object-src`, `frame-src`, `upgrade-insecure-requests`) block no resource type or origin that the site's own pages currently load, so no legitimate first-party resource is affected.

## Decision record: single `source: '/(.*)'` rule retained

No per-path exceptions are introduced (e.g. excluding `/icons/*` from CORP so that the SVG could theoretically be loaded cross-origin by third parties). A second `headers()` entry was considered and rejected: it would add a second rule to maintain indefinitely, for the sole benefit of relaxing protection on an asset (`/icons/eco-metrics-earth.svg`) that needs no such relaxation — CORP `same-origin` does not break its use as an OG/Twitter preview image (see above), so there is no functional reason to carve out an exception.

## Alternatives considered

- **`Cross-Origin-Opener-Policy: same-origin-allow-popups` now, instead of `same-origin`.** Rejected: the stricter `same-origin` is preferred while the site has zero popup-based flows, to get the maximum isolation benefit today. The relaxation is deferred until it is actually needed (see Risk assessment above).
- **`Cross-Origin-Embedder-Policy` (COEP).** Not requested and out of scope — COEP requires all subresources to explicitly opt in (via CORP or CORS), which is a much larger, higher-risk change than what was scoped here. Not included in this change.
- **Per-path header override to relax CORP on `/icons/*`.** Rejected — see Decision record above.
- **Overriding Vercel's `access-control-allow-origin: *`.** Rejected — out of scope, see proposal.md Non-goals.

## Risks / rollout

- Low risk: all additions are either denials of unused features (`object-src`, `frame-src`, extra `Permissions-Policy` entries) or isolation headers with no current cross-origin dependency in the app.
- Verification is via the existing Playwright E2E suite (`apps/web/e2e/security-headers.spec.ts`), extended in place, run against home, category, and 404 pages exactly as the existing coverage does.
- Environment-specific behavior is limited to `upgrade-insecure-requests` (production only). Every other addition — the four other CSP directives, COOP, CORP and the extended `Permissions-Policy` — applies identically in development and production.

### E2E coverage limitation for `upgrade-insecure-requests`

The Playwright suite runs against a **development** server: `apps/web/playwright.config.ts` starts `apps/web/e2e/run-dev-servers.ts`, which spawns `nx dev web`. Because `upgrade-insecure-requests` is gated to production, the E2E suite **cannot** assert its presence — an assertion that it is present would always fail.

The suite therefore asserts the *gate* instead: that the directive is absent from the dev-server CSP. Its presence in production responses is not covered by automated tests. This is consistent with the pre-existing coverage gap for `script-src`'s production branch (the absence of `'unsafe-eval'` in production is likewise untested), and the header is directly observable against a deployment with `curl -sSI <url> | grep -i content-security-policy`.
