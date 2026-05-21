## 1. Setup

- [x] 1.1 Install `class-validator` and `class-transformer` as exact versions in `apps/api/package.json`
- [x] 1.2 Run `npm install` to update lockfile
- [x] 1.3 Verify dependencies are resolved correctly with `npm ls class-validator class-transformer`

## 2. Global ValidationPipe

- [x] 2.1 Import `ValidationPipe` from `@nestjs/common` in `apps/api/src/main.ts`
- [x] 2.2 Register global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- [x] 2.3 Verify API boots successfully (`npx nx serve api` smoke test)

## 3. Demo DTOs (Mock — to be replaced in P2)

- [x] 3.1 Create `apps/api/src/common/dto/get-metrics-query.dto.ts` with `@IsOptional()`, `@IsString()`, `@IsDateString()` decorators
- [x] 3.2 Create `apps/api/src/common/dto/create-metric.dto.ts` with `@IsString()`, `@IsNotEmpty()`, `@IsNumber()`, `@Type(() => Number)` decorators
- [x] 3.3 Add JSDoc `@deprecated MOCK — remove when real eco modules are implemented in P2` to both DTOs
- [x] 3.4 Export DTOs from `apps/api/src/common/dto/index.ts`

## 4. Demo Controller Wiring (Mock — to be replaced in P2)

- [x] 4.1 Create a temporary demo controller or extend existing one to consume the DTOs via `@Query()` and `@Body()`
- [x] 4.2 Ensure the controller endpoints are reachable under `/api/v1/`

## 5. Unit Tests for DTOs

- [x] 5.1 Create `apps/api/__tests__/common/dto/get-metrics-query.dto.test.ts`
- [x] 5.2 Create `apps/api/__tests__/common/dto/create-metric.dto.test.ts`
- [x] 5.3 Test valid inputs pass validation
- [x] 5.4 Test invalid inputs fail with correct error messages
- [x] 5.5 Test extra fields are rejected when `forbidNonWhitelisted: true` (covered by integration tests below)

## 6. Integration Tests

- [x] 6.1 Add integration test in `apps/api/__tests__/common/dto/demo-validation.controller.test.ts` that:
  - Boots the real NestJS app with `NestFactory.create`
  - Uses `supertest` to hit an endpoint with invalid payload
  - Asserts HTTP `400 Bad Request` response
- [x] 6.2 Add test for valid payload returning `200 OK` (GET) / `201 Created` (POST)
- [x] 6.3 Add test for extra fields being rejected

## 7. Verification & Cleanup

- [x] 7.1 Run `npm run lint` — zero errors, zero warnings
- [x] 7.2 Run `npm run build` — compiles successfully
- [x] 7.3 Run `npm run test` — all tests pass with zero errors and zero warnings (api: 36/36, web: 142/142, shared: 8/8)
- [x] 7.4 Run `npx prettier --write "apps/api/**/*.{ts,tsx,js,json}"`
- [x] 7.5 Review that all demo/mock code has clear comments indicating it is temporary
