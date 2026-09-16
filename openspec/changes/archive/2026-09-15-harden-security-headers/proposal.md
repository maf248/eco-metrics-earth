# Harden Security Headers

## Goals

- Tighten the existing Content-Security-Policy (CSP) served by `apps/web/next.config.ts` by adding directives that `default-src 'self'` does not cover: `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`, `frame-src 'none'`, and `upgrade-insecure-requests` (production builds only — gated behind the `isDev` flag already present in the file).
- Add two new response headers on all routes: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin`.
- Extend the existing `Permissions-Policy` header to also deny `payment`, `usb`, and `midi`, in addition to the existing `camera`, `microphone`, and `geolocation` denials.
- Keep coverage on the single existing `headers()` rule (`source: '/(.*)'`) so all routes continue to receive the same header set with no per-path exceptions.

## Non-goals / Out of scope

- **Do not touch Vercel's injected `access-control-allow-origin: *` header.** This header is emitted by Vercel's CDN layer, not by repo code (confirmed: no middleware, no route handlers exist in this codebase that set it). Rationale for leaving it as-is:
  - On a credential-less public HTML document, `ACAO: *` exposes nothing that is not already public.
  - Overriding it via the single `/(.*)` headers rule would also apply to `/_next/static`, where Vercel sets `ACAO: *` intentionally on immutable build assets.
- Do not touch Vercel's injected `content-disposition: inline` header — same rationale (CDN-level, not repo code, out of scope for this change).
- Do not alter the `isDev` branching logic for `script-src` (dev vs. production `'unsafe-eval'` handling) — it stays exactly as it is today.
- Do not add per-path header exceptions (e.g. excluding `/icons/*` from CORP) — a single `source: '/(.*)'` rule is kept for all routes.
- Do not add nonce-based CSP or otherwise change `script-src`/`style-src`/`font-src`/`img-src`/`connect-src` — those directives are unchanged.
- Do not modify the unrelated ".env files removed from git tracking" requirement in `openspec/specs/web-security-headers/spec.md`.
- No new E2E test file — the new assertions extend the existing `apps/web/e2e/security-headers.spec.ts` file and its existing `assertSecurityHeaders` helper.

## Impact

- **Code**: `apps/web/next.config.ts` — the `csp` array gains 4 unconditional entries, plus `upgrade-insecure-requests` appended only when `isDev` is false; the `headers` array in the single `/(.*)` rule gains 2 new header objects (COOP, CORP); the existing `Permissions-Policy` header value is extended.
- **Tests**: `apps/web/e2e/security-headers.spec.ts` — `assertSecurityHeaders` is extended to assert the two new headers, and new assertions/tests are added for the new CSP directives and the extended `Permissions-Policy` value. Existing home/category/404 page test coverage is reused (no new describe blocks needed beyond what's required for the new assertions).
- **Spec**: `openspec/specs/web-security-headers/spec.md` — the "Web app serves HTTP security headers on all routes" and "Web app serves a Content-Security-Policy header" requirements are modified (full restated text) to reflect the new header/directive set. The `.env` requirement is untouched.
- **Runtime behavior**: Stricter CSP and new isolation headers on every response. No visible UI change. No impact on Vercel CDN-level headers.
