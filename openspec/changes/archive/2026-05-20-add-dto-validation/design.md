## Context

The API (`apps/api`) is a NestJS 11 BFF bootstrapped in `main.ts` with `helmet`, CORS, and a global prefix `/api/v1`. It currently has no validation layer — controllers receive raw payloads and query params as plain objects. TypeScript strict mode does not protect at runtime. Before implementing real eco-category endpoints in P2, we need a hardened validation infrastructure.

## Goals / Non-Goals

**Goals:**
- Provide runtime type validation for every incoming request (body, query, params).
- Reject malformed requests automatically with a clear `400 Bad Request` and detailed field-level errors.
- Strip unexpected fields (`whitelist`) and reject payloads containing them (`forbidNonWhitelisted`) to enforce strict contracts.
- Auto-transform primitives (`transform: true`) so that query strings like `"42"` become `42` for numeric fields.
- Establish a folder convention (`src/common/dto/`) for future DTOs.
- Prove the pipeline works end-to-end via demo DTOs and automated tests.

**Non-Goals:**
- No changes to existing endpoint behavior (`/health`, `/`).
- No real eco-category modules or external API integrations.
- No OpenAPI/Swagger documentation (covered by I14).

## Decisions

1. **Global `ValidationPipe` in `main.ts` rather than per-controller pipes.**
   - *Rationale:* Ensures consistent behavior across all endpoints without risk of forgetting a decorator. NestJS recommends this as the standard pattern.
   - *Alternative considered:* Per-method `@UsePipes` — rejected because it is error-prone and duplicates configuration.

2. **`whitelist: true` + `forbidNonWhitelisted: true`.**
   - *Rationale:* Enforces strict contracts from day one. Any unexpected field immediately fails, which prevents silent data leaks and forces consumers to be precise.
   - *Risk:* Could break future integrations that send extra metadata. Mitigation: this is a new project with no external consumers yet; strictness is preferable.

3. **`transform: true`.**
   - *Rationale:* Query params and JSON bodies arrive as strings. Without transformation, `@IsNumber()` would fail on `"42"`. `class-transformer` handles this automatically.
   - *Alternative considered:* Manual `parseInt` in services — rejected as boilerplate-heavy and inconsistent.

4. **Demo DTOs in `src/common/dto/` with explicit mock/demo comments.**
   - *Rationale:* We need concrete classes for the `ValidationPipe` to validate, otherwise there is nothing to test. Using a dedicated folder with clear naming/comments ensures they are easy to locate and remove later.
   - *Naming:* `GetMetricsQueryDto` and `CreateMetricDto` use generic names but include a JSDoc `@deprecated MOCK — remove when real eco modules are implemented in P2`.

5. **Unit tests for DTOs + integration tests for HTTP layer.**
   - *Rationale:* Unit tests validate individual `class-validator` rules quickly. Integration tests with `supertest` confirm the global pipe is actually wired into the HTTP stack and returns correct status codes.

## Risks / Trade-offs

- **[Risk]** `forbidNonWhitelisted: true` may be too aggressive for future public API consumers. → *Mitigation:* documented as a deliberate early choice; can be relaxed to `forbidNonWhitelisted: false` with a one-line change in `main.ts`.
- **[Risk]** Adding `class-transformer` and `class-validator` increases bundle size. → *Mitigation:* both are small, tree-shakeable, and standard in NestJS ecosystems.
- **[Risk]** Tests that assert exact `ValidationPipe` error message format may break on library upgrades. → *Mitigation:* assertions focus on status code (`400`) and presence of field names, not exact strings.

## Migration Plan

No migration needed — this is additive infrastructure. Existing endpoints without DTOs continue to work; they simply receive unvalidated plain objects as before until they opt-in to DTOs.

## Open Questions

None. Scope is well-defined and bounded by the proposal.
