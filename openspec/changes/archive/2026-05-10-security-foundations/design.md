## Context

The eco-metrics earth API (`apps/api`, NestJS 11) and web app (`apps/web`, Next.js 16) currently emit no HTTP security headers. CORS origin is read raw from `process.env` without schema validation — a wildcard `*` would silently open the API to any cross-origin caller. No rate limiting exists. Two empty `.env` files are tracked in git, creating a path for accidental secret commits.

Current state:
- `main.ts` reads `process.env['CORS_ORIGIN']` directly and passes it as the CORS origin without validation.
- `AppModule` has a Joi schema that validates `PORT` and `NODE_ENV` but not `CORS_ORIGIN`.
- `AppConfigService` provides typed access to validated env vars but does not expose `CORS_ORIGIN`.
- `next.config.ts` has no `headers()` function — zero security headers on web responses.
- No throttling middleware or guard anywhere in the API.

## Goals / Non-Goals

**Goals:**
- Emit standard HTTP security headers from both the API (via Helmet) and the web app (via Next.js `headers()`).
- Validate `CORS_ORIGIN` through Joi so startup fails fast on invalid or wildcard values.
- Enforce a 60 req/60 s per-IP rate limit globally on the API using `@nestjs/throttler`.
- Prevent the web app from being embedded in iframes (`X-Frame-Options: DENY`).
- Prepare the CSP to allow Google Fonts and future analytics without relaxing `default-src`.
- Remove empty `.env` / `.env.local` files from git tracking.

**Non-Goals:**
- Nonce-based or hash-based CSP (requires Next.js middleware — deferred).
- Per-route throttle overrides.
- Authentication or authorisation.
- WAF or infrastructure-level DDoS protection.

## Decisions

### D1 — Use `helmet` with defaults for the API

**Decision**: Call `app.use(helmet())` with no custom options. Helmet's defaults enable: `X-DNS-Prefetch-Control`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-XSS-Protection: 0` (correct — tells IE to disable its broken filter), and `Strict-Transport-Security` (HSTS) with a 15-day max-age.

**Alternative considered**: Custom Helmet config to set `frameguard: { action: 'deny' }`. Deferred — the API is not a UI and iframe embedding of API endpoints is not a concern in practice. The web app handles `X-Frame-Options: DENY` via Next.js headers.

**Rationale**: Helmet's defaults are industry-standard and low-risk. Custom config adds maintenance burden without proportionate security gain for the API.

### D2 — Validate `CORS_ORIGIN` through Joi; expose via `AppConfigService`

**Decision**: Add `CORS_ORIGIN: Joi.string().uri().default('http://localhost:3000')` to the Joi `validationSchema` in `AppModule`. Add a `corsOrigin` getter to `AppConfigService`. Read the validated value in `main.ts` via `appConfig.corsOrigin`.

**Alternative considered**: Keep reading from `process.env` directly in `main.ts` but add runtime validation. Rejected — bypasses the existing typed config layer and duplicates validation logic.

**Rationale**: Centralises env var ownership in `AppConfigService`. Startup fails fast with a clear error if `CORS_ORIGIN` is not a valid URI.

### D3 — `ThrottlerModule.forRoot` with `APP_GUARD`

**Decision**: Add `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])` to `AppModule.imports`. Provide `ThrottlerGuard` globally via `{ provide: APP_GUARD, useClass: ThrottlerGuard }` in `AppModule.providers`.

**Alternative considered**: Decorating individual controllers with `@Throttle()`. Rejected — the global guard approach is the recommended NestJS pattern and ensures no new controller is accidentally unprotected.

**Rationale**: 60 req/min per IP is conservative but sufficient for a dashboard BFF. Can be overridden per-route with `@SkipThrottle()` or `@Throttle()` when needed.

### D4 — Next.js `headers()` for web security headers

**Decision**: Add an async `headers()` function to `apps/web/next.config.ts` returning an array with a single entry matching `source: '/(.*)'` (all routes). The CSP will use `unsafe-inline` for `script-src` as a known limitation of Next.js App Router inline scripts (hydration scripts are not nonce-able without custom middleware). Document this in comments.

**Alternative considered**: Custom Next.js middleware that injects headers with a nonce. Rejected — significant complexity; deferred until Next.js first-class nonce support stabilises.

**CSP design**:
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob:;
connect-src 'self';
frame-ancestors 'none';
```
`unsafe-inline` for styles is required for Tailwind's inline style injection in some edge cases and for future CSS-in-JS.

## Risks / Trade-offs

- **HSTS in development**: Helmet enables HSTS by default, which can cause issues if the API is accessed over HTTP in local dev. Mitigation: Helmet only sets HSTS when `NODE_ENV === 'production'` by default — verify this is correct with the installed version.
- **CSP breakage on future third-party scripts**: If analytics or widget scripts are added without updating the CSP, they will be silently blocked. Mitigation: Document CSP update procedure in `AGENTS.md`; the CSP is in `next.config.ts` (easy to find).
- **ThrottlerGuard and tests**: The global guard will affect integration tests that make rapid requests. Mitigation: Use `@SkipThrottle()` on test-specific controllers, or mock `ThrottlerGuard` in unit tests.
- **`git rm --cached`**: Removing tracked files does not delete them locally but requires all contributors to pull. Mitigation: Note this in the commit message.

## Migration Plan

1. Install new npm packages (helmet, @nestjs/throttler) — no breaking changes to existing behavior.
2. Add `CORS_ORIGIN` to Joi schema with a default — backward compatible (no existing deployments break if env var is absent).
3. Apply `helmet()` and `ThrottlerGuard` — additive, no API contract changes.
4. Add `headers()` to `next.config.ts` — additive, web app behavior unchanged for end users.
5. Run `git rm --cached` for `.env` files — no code change.
6. Run full test suite; fix any throttler-related test failures by mocking the guard.

## Open Questions

- Should `HSTS` be disabled in the Helmet config for the dev environment? Check the `helmet` version's default behavior before committing.
- Are there any existing API clients (e.g., local scripts, Postman collections) that would be affected by the rate limit? If so, raise the limit or add a `@SkipThrottle()` escape hatch on the health endpoint.
