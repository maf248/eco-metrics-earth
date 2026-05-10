## 1. Dependencies

- [x] 1.1 Install `helmet` in `apps/api` with exact version: `npm install --save-exact helmet` (run from repo root with `--workspace=apps/api` or update `apps/api/package.json` directly and run `npm install`)
- [x] 1.2 Install `@nestjs/throttler` in `apps/api` with exact version: `npm install --save-exact @nestjs/throttler` (same approach)

## 2. API — Helmet middleware

- [x] 2.1 In `apps/api/src/main.ts`, import `helmet` from `'helmet'` and call `app.use(helmet())` immediately after `const app = await NestFactory.create(AppModule)` and before `app.setGlobalPrefix`

## 3. API — CORS_ORIGIN validation

- [x] 3.1 In `apps/api/src/app/app.module.ts`, add `CORS_ORIGIN: Joi.string().uri().default('http://localhost:3000')` to the Joi `validationSchema` object
- [x] 3.2 In `apps/api/src/config/app-config.service.ts`, add a `get corsOrigin(): string` getter that returns `this.configService.getOrThrow<string>('CORS_ORIGIN')`
- [x] 3.3 In `apps/api/src/main.ts`, replace `process.env['CORS_ORIGIN'] ?? 'http://localhost:3000'` with `appConfig.corsOrigin` — inject `AppConfigService` by getting it from the app: `const appConfig = app.get(AppConfigService)`

## 4. API — Rate limiting

- [x] 4.1 In `apps/api/src/app/app.module.ts`, add `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])` to the `imports` array (import `ThrottlerModule` from `'@nestjs/throttler'`)
- [x] 4.2 In `apps/api/src/app/app.module.ts`, add `{ provide: APP_GUARD, useClass: ThrottlerGuard }` to the `providers` array (import `APP_GUARD` from `'@nestjs/core'`, `ThrottlerGuard` from `'@nestjs/throttler'`)

## 5. Web — Security headers

- [x] 5.1 In `apps/web/next.config.ts`, add an `async headers()` function to the `nextConfig` object that returns an array with one entry: `{ source: '/(.*)', headers: [...] }` containing all required security headers (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy, Content-Security-Policy as per design.md)
- [x] 5.2 Verify the CSP string includes: `default-src 'self'`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, `font-src 'self' https://fonts.gstatic.com`, `img-src 'self' data: blob:`, `connect-src 'self'`, `frame-ancestors 'none'`
- [x] 5.3 Add a comment in `next.config.ts` above the CSP explaining that `unsafe-inline` for `script-src` is required by Next.js App Router hydration scripts and should be tightened with nonces when Next.js adds first-class nonce support

## 6. Repository — Remove tracked .env files

- [x] 6.1 Run `git rm --cached apps/api/.env apps/web/.env.local` to stop tracking the empty env files
- [x] 6.2 Verify `.gitignore` at repo root already contains entries for `.env` and `.env.local` patterns (do NOT add them if already present)
- [x] 6.3 Verify `apps/api/.env.example` and `apps/web/.env.example` exist with placeholder variable documentation (create if missing)

## 7. Tests

- [x] 7.1 In `apps/api/__tests__/app/app.module.test.ts`, add `CORS_ORIGIN: 'http://localhost:3000'` to the mock environment or ensure the test still compiles the module correctly after adding `CORS_ORIGIN` to the Joi schema (the Joi default means it should pass without setting it)
- [x] 7.2 Verify all existing API tests still pass with the ThrottlerGuard registered globally — if any test makes more than 60 requests in a window, add `@SkipThrottle()` decorator or mock the guard in that test's `TestingModule`
- [x] 7.3 Run `npx nx test api` and `npx nx test web` — fix any failures before marking this iteration complete

## 8. Verification

- [x] 8.1 Run `npx nx build api` and `npx nx build web` — both must succeed with zero errors
- [x] 8.2 Run `npm run lint` — zero errors and zero warnings
- [x] 8.3 Manually start the API (`npx nx serve api`) and verify a request to `GET http://localhost:3001/api/v1/health` includes `x-content-type-options: nosniff` in the response headers
- [x] 8.4 Manually start the web app (`npx nx serve web`) and verify a request to `http://localhost:3000` includes `x-frame-options: DENY` in the response headers
