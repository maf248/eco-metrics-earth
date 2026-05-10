## Why

The API and web app currently expose no HTTP security headers, accept unvalidated CORS origins (including wildcards), and have no rate limiting. These omissions create real attack vectors — clickjacking, XSS header misconfiguration, CORS abuse, and brute-force attacks — before any user-facing feature is built. Fixing the foundation now prevents retrofitting security onto a growing codebase.

## What Changes

- **API**: Install and configure `helmet` to emit security headers on all responses (X-Frame-Options, X-Content-Type-Options, HSTS, etc.).
- **API**: Validate `CORS_ORIGIN` environment variable through the Joi schema in `AppModule`; read the validated value from `AppConfigService` instead of accessing `process.env` directly in `main.ts`.
- **API**: Install `@nestjs/throttler` and apply a global rate-limit guard (60 req / 60 s per IP) via `ThrottlerModule` and `APP_GUARD`.
- **Web**: Add a `headers()` function to `next.config.ts` that emits `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and a `Content-Security-Policy` covering current usage (self-hosted assets) while explicitly allowing future Google Fonts and leaving room for analytics scripts.
- **Repo**: Remove `apps/api/.env` and `apps/web/.env.local` from git tracking (they are empty stubs that put contributors at risk of accidentally committing secrets).

## Non-Goals

- Authentication / authorization (out of scope for this iteration).
- Per-route rate limiting or dynamic throttle overrides.
- Nonce-based CSP (deferred until Next.js supports it without extra middleware).
- WAF, DDoS protection, or infrastructure-level security controls.
- Adding new environment variables beyond `CORS_ORIGIN`.

## Capabilities

### New Capabilities

- `api-security-hardening`: Helmet headers + validated CORS origin + global rate limiting on the NestJS API.
- `web-security-headers`: HTTP security headers (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy) served by the Next.js app for all routes.

### Modified Capabilities

*(none — no existing spec-level behavior is changing)*

## Impact

- **`apps/api`**: `main.ts`, `app/app.module.ts`, `config/app-config.service.ts`, `package.json` (new deps: `helmet`, `@nestjs/throttler`).
- **`apps/web`**: `next.config.ts`, `package.json` (no new deps; headers() is built-in to Next.js).
- **Repo root**: `.gitignore` verification; `git rm --cached` for two tracked empty files.
- **Tests**: `AppModule` integration test may need env var stub for `CORS_ORIGIN`; throttler guard tests may need mock in unit tests.
- **Breaking**: None — all changes are additive or tighten existing behaviour without removing APIs.
