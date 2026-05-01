# Tasks — fix-api-robustness

## 1. Bootstrap Hardening

- [x] 1.1 In `apps/api/src/main.ts`, append `.catch((err: unknown) => { console.error('Fatal error during bootstrap:', err); process.exit(1); })` to the `bootstrap()` call
- [x] 1.2 Verify the application still starts correctly with `npx nx serve api` and the health endpoint responds at `http://localhost:3001/api/v1/health`

## 2. CORS Configuration

- [x] 2.1 In `apps/api/src/main.ts`, add `app.enableCors({ origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000' })` immediately after `app.setGlobalPrefix('api/v1')`
- [x] 2.2 Add `CORS_ORIGIN` to `.env.example` (at repo root or `apps/api/`) with a comment explaining its purpose and the default value
- [x] 2.3 Verify the health endpoint is reachable and responds with the correct `Access-Control-Allow-Origin` header when `CORS_ORIGIN` is set

## 3. Env Var Validation

- [x] 3.1 Check whether `joi` (or `@hapi/joi`) is already listed in `apps/api/package.json`; if not, add `joi` as a production dependency with an exact pinned version (`npm install --save-exact joi` inside `apps/api/`)
- [x] 3.2 In `apps/api/src/app/app.module.ts`, import `* as Joi from 'joi'` and add a `validationSchema` to `ConfigModule.forRoot()` validating `PORT` as `Joi.number().port().default(3001)` and `NODE_ENV` as `Joi.string().valid('development', 'test', 'production').default('development')`; set `validationOptions: { allowUnknown: true, abortEarly: true }`
- [x] 3.3 Verify that setting `PORT=not-a-port` causes the application to fail at startup with a clear Joi validation error message
- [x] 3.4 Verify that omitting both `PORT` and `NODE_ENV` still allows the application to start successfully using the defaults

## 4. AppConfigService Test

- [x] 4.1 Create `apps/api/__tests__/config/app-config.service.test.ts` with a `describe('AppConfigService')` block using a mocked `ConfigService` (plain `jest.fn()`, no `Test.createTestingModule()`)
- [x] 4.2 Add an `it()` case: `port` getter returns the numeric value from `ConfigService` when `PORT` is set (e.g. `4000`)
- [x] 4.3 Add an `it()` case: `port` getter returns `3001` when `ConfigService` returns `undefined` for `PORT`
- [x] 4.4 Add an `it()` case: `nodeEnv` getter returns the configured string when `NODE_ENV` is set (e.g. `'production'`)
- [x] 4.5 Add an `it()` case: `nodeEnv` getter returns `'development'` when `ConfigService` returns `undefined` for `NODE_ENV`
- [x] 4.6 Verify `npx nx test api` passes with zero errors and zero warnings

## 5. Final Verification

- [x] 5.1 Run `npm run lint` — must pass with zero errors
- [x] 5.2 Run `npm run build` — must pass with zero type errors
- [x] 5.3 Run `npm run test` — all test suites must pass with zero errors and zero warnings
