## Why

The API currently accepts any payload or query parameters without validation. TypeScript checks types at compile time but provides no runtime guarantees, so malformed requests (e.g., invalid dates, wrong types, extra fields) can propagate to business logic and cause hard-to-debug runtime errors. Adding a global validation layer with `class-validator` and `class-transformer` hardens the API before real eco-category endpoints are implemented in P2.

## What Changes

- Install `class-validator` and `class-transformer` as exact-version dependencies in `apps/api/package.json`.
- Register a global `ValidationPipe` in `apps/api/src/main.ts` with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`.
- Create demo DTOs (marked as mock/demo) to exercise the validation pipeline:
  - `GetMetricsQueryDto` for query parameters (optional date range, category filter).
  - `CreateMetricDto` for body payloads (name, value, unit).
- Wire a temporary demo controller (or extend an existing one) to consume the DTOs so the pipeline has concrete contracts to validate.
- Add unit tests for DTO validation rules.
- Add integration tests with `supertest` that hit the actual HTTP layer and assert `400 Bad Request` for invalid payloads and `200 OK` for valid ones.

## Capabilities

### New Capabilities
- `dto-validation`: Global runtime validation infrastructure for the NestJS API.
- `demo-dtos`: Temporary DTOs and a demo endpoint used to prove the validation pipeline works end-to-end. **These are explicitly marked as mock/demo and will be removed or replaced when real eco-category modules are implemented in P2.**

### Modified Capabilities
- None. No existing spec requirements are changing.

## Impact

- `apps/api/package.json` — two new runtime dependencies.
- `apps/api/src/main.ts` — bootstrap code registers `ValidationPipe`.
- `apps/api/src/common/dto/` — new folder for DTOs.
- `apps/api/__tests__/common/dto/` — unit tests for DTOs.
- `apps/api/__tests__/app/bootstrap.test.ts` or similar — integration tests for the global pipe.

## Non-Goals

- This change does not modify the behavior of existing `/health` or `/` endpoints.
- It does not integrate with external APIs or add real eco-category modules.
- It does not introduce authentication, authorization, or rate-limiting beyond what already exists.
