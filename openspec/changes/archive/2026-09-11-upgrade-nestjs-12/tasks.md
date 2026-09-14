# Tasks: Upgrade NestJS 11 → 12

> All version changes use **exact pins** (no `^` / `~`).
> **No commits, pushes, or PRs** — per explicit user decision, the implementation stays in the working tree. The user validates manually (Swagger UI, unit tests, E2E) before authorizing any commit. This file intentionally contains **no commit tasks**.

---

## Task Group 0 — Baseline

### [x] 0.1 Record the audit baseline

- Run `npm audit --json` and record the exact counts: expected **32 total (4 critical, 21 high, 5 moderate, 2 low)**.
- Record the NestJS-family vulnerable packages: `@nestjs/platform-express` (via `multer` 2.1.1) and `@nestjs/swagger` (via `js-yaml` 3.14.2).

**Verification:** Counts match ROADMAP I01. If they differ, stop and report — the audit landscape changed since 11 Sep 2026 and the spec's expectations must be re-checked before proceeding.

### [x] 0.2 Confirm the starting state

- `node -v` → 24.x (`.nvmrc`); `npm ls @nestjs/common` → single hoisted 11.1.21.

**Verification:** As stated. Any deviation → stop and report.

---

## Task Group 1 — Dependency updates

### [x] 1.1 Upgrade the six @nestjs/* pins (exact, apps/api scope)

- Run:
  ```bash
  npm install --save-exact @nestjs/common@12.0.1 @nestjs/core@12.0.1 \
    @nestjs/platform-express@12.0.1 @nestjs/swagger@12.0.1 @nestjs/config@12.0.0 \
    --workspace=api
  npm install --save-exact --save-dev @nestjs/testing@12.0.1 --workspace=api
  ```
- **Leave `@nestjs/throttler` at `6.5.0`** — deliberate hold (no Nest 12 peer support published; see design.md).
- Deterministic alternative: hand-edit the six pins in `apps/api/package.json`, then a single root `npm install`.

**Verification:** `grep '"@nestjs/' apps/api/package.json` shows `12.0.1` × 5 + `12.0.0` (config), all exact with no `^`/`~`, and `"@nestjs/throttler": "6.5.0"` untouched. `npm ls @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/swagger @nestjs/config @nestjs/testing` resolves a single 12.x version each — no nested 11.x copies.

### [x] 1.2 Remove the dead dependency swagger-ui-express

- Run `npm uninstall swagger-ui-express --workspace=api` (or delete the line from `apps/api/package.json` and re-run `npm install`).

**Verification:** `grep -r "swagger-ui-express" apps/api/package.json` → no matches; `npm ls swagger-ui-express` → empty. Zero source imports existed (pre-verified by grep — nothing else to touch).

### [x] 1.3 Reset NX cache

- Run `npx nx reset` (stale daemon/cache state after a dependency swap produces false results).

**Verification:** Command exits 0.

---

## Task Group 2 — Source migration (the only source change)

### [x] 2.1 Migrate validationOptions to libraryOptions in app.module.ts

- In `apps/api/src/app/app.module.ts` (lines 26–29), move the Joi-specific options under `libraryOptions`:
  ```ts
  validationOptions: {
    libraryOptions: {
      allowUnknown: true,
      abortEarly: true,
    },
  },
  ```
- Change nothing else in the file — the Joi schema, `ThrottlerModule.forRoot`, controllers, and providers stay byte-identical.

**Verification:** `git status` shows exactly three implementation files changed so far: `apps/api/package.json`, `package-lock.json`, `apps/api/src/app/app.module.ts`. No other `src/**` file is touched by this change.

### [x] 2.2 Add fallback catch-all route to restore JSON 404s for unknown routes

- **Root cause:** NestJS 12 reworked HTTP adapter error mapping; unmapped routes no longer generate a `NotFoundException` inside the NestJS pipeline, so Express 5 returns its default HTML 404 instead of the JSON shape produced by the global `AllExceptionsFilter`.
- **Fix:** create `apps/api/src/common/fallback/fallback.controller.ts` with `@All('{*path}')` that throws `NotFoundException(`Cannot ${req.method} ${req.originalUrl}`)`, plus `apps/api/src/common/fallback/fallback.module.ts`.
- Register `FallbackModule` **last** in `AppModule.imports` so the wildcard route is registered after all real routes and does not shadow `/api/v1/health`, `/api/v1/water-footprint/products`, `/api/v1/demo-validation`, etc.
- Add unit tests in `apps/api/__tests__/common/fallback/fallback.controller.test.ts` asserting:
  - Real routes are not shadowed (200).
  - Unknown routes return `404` with `content-type: application/json`.
  - Body matches the global filter shape: `{ success: false, error: "Cannot GET /api/v1/nonexistent", status: 404 }`.
  - The HTTP method is reflected in the error message.

**Verification:** `npx nx serve api` + curl: `/api/v1/health` → 200 JSON; `/api/v1/water-footprint/products` → 200 JSON; `/api/v1/nonexistent` → 404 JSON with the exact baseline shape. `npx nx test api` includes the new fallback tests and stays green.

---

## Task Group 3 — Validation gates

### [x] 3.1 Production build

- `npx nx build api` — webpack build via `NxAppWebpackPlugin` succeeds.
- Confirm the regenerated `apps/api/dist/package.json` no longer lists `swagger-ui-express`.

**Verification:** Exit 0; `grep swagger-ui-express apps/api/dist/package.json` → no match.

### [x] 3.2 Typecheck

- `npx nx run api:typecheck` — TS 5.9.3 against the Nest 12 type surface.

**Verification:** Exit 0.

### [x] 3.3 Unit tests — api

- `npx nx test api` — 54 tests (50 baseline + 1 rate-limit coverage from task 3.10 + 3 fallback coverage from task 2.2), zero errors, zero warnings; coverage thresholds met (80% statements/functions/lines; branches intentionally omitted for api).
- The pre-existing `WaterFootprintService` `console.warn` (data file not found) is documented in `ROADMAP.md` as I18; it is **not** introduced by this change and does not block the gate.

**Verification:** Exit 0; no `console.error` in output; coverage summary meets thresholds. This gate is the empirical proof that the Jest 30.4.2 + `@swc/jest` CJS pipeline consumes the ESM-published `@nestjs/*` 12 packages with the empirically-required `transformIgnorePatterns` config, and that the `ThrottlerGuard` resolves in the DI graph.

### [x] 3.4 Unit tests — shared + web (lockfile fallout check)

- `npx nx test shared` (8 tests) and `npx nx test web` (221 tests) — zero errors, zero warnings; web branches ≥ 75%.
- No snapshot changes are expected (nothing in web changed).

**Verification:** Both exit 0. If any `.snap` file diffs, investigate — that is an unintended side effect of the upgrade, not something to snapshot-update blindly.

### [x] 3.5 Lint

- `npm run lint` — zero errors, zero warnings.

**Verification:** Exit 0.

### [x] 3.6 Serve + health + 404

- `npx nx serve api` — bootstrap without errors.
- `curl http://localhost:3001/api/v1/health` → `200` with `{ "status": "ok" }`.
- `curl -i http://localhost:3001/api/v1/water-footprint/products` → `200` JSON (verifies the fallback wildcard does not shadow real routes).
- `curl -i http://localhost:3001/api/v1/nonexistent` → `404` with `content-type: application/json` and body `{ "success": false, "error": "Cannot GET /api/v1/nonexistent", "status": 404 }` (restored by the fallback controller from task 2.2).
- Stop the server afterwards.

**Verification:** As stated — proves the Nest 12 runtime bootstrap (lifecycle ordering, default logger, helmet on Express 5, CORS) on the real server and that the catch-all route is registered after all real routes.

### [x] 3.7 Manual Swagger UI check (user-validated)

- Set `SWAGGER_ENABLED=true` in `apps/api/.env` (the committed default is `false`), restart `npx nx serve api`, and open `http://localhost:3001/api/v1/api/docs`.
- Expected: the Swagger UI loads with the eco-metrics earth API document (Health, Demo, Water Footprint tags) — served by `@nestjs/swagger` 12's own `swagger-ui-dist`, with no `swagger-ui-express` installed.
- Revert `SWAGGER_ENABLED=false` afterwards; never commit `.env`.

**Verification:** UI serves and renders the document. This gate is manual by design — no automated Swagger coverage exists in the repo (verified).

### [x] 3.8 Security audit

- Run `npm audit --json` and record the final counts by severity.
- Verify: no advisory lists `multer` or `js-yaml` as a vulnerable package; `@nestjs/platform-express` / `@nestjs/swagger` no longer appear as fix paths for those chains.
- Expected: total ~8 lower than the 32 baseline (~24). The `express`/`qs`/`body-parser` advisories are expected to remain (no fix available — their presence is **not** a failure of this change).

**Verification:** `multer`/`js-yaml` chains gone; before/after counts recorded for the ROADMAP I01 update (task 4.4). If a NestJS-family chain unexpectedly persists, evaluate a root `package.json` `overrides` pin (precedent: `chokidar`, `readdirp`, `smol-toml`) and re-run Group 3 — do not expand scope beyond the NestJS family.

### [x] 3.9 E2E suite (user-run, manual)

- The user runs `npm run e2e` manually (Playwright, 49 specs). The 10 API specs in `apps/web/e2e/api-health.spec.ts` are the ones exercising the Nest 12 app end-to-end (health, CORS, 404, demo-validation GET/POST).
- **Pre-existing flake notice (ROADMAP I17):** fresh local runs fail intermittently with `ECONNREFUSED :3001` (API readiness races + orphan dev-server processes — verified pre-existing on clean `develop`). A failure matching that pattern is **not** a regression of this upgrade: re-run and/or compare against the documented baseline before investigating.

**Verification:** User-validated. API specs green (accounting for the I17 flake). Any non-I17-pattern failure is investigated as a potential upgrade regression before proceeding.

### [x] 3.10 Direct rate-limit coverage — ThrottlerGuard 429 under Nest 12 (user-approved option B)

- Add a test that exercises the rate limit **directly**, proving that `@nestjs/throttler` 6.5.0 returns 429 under Nest 12. Until now the guard had no direct unit or E2E coverage (verified — see design.md, "Held-back dependency").
- **Verified response shape (read from the `@nestjs/throttler` 6.5.0 dist source on 11 Sep 2026 — re-confirm empirically with a quick manual loop before freezing the assertions):** status **429**; body `{ "statusCode": 429, "message": "ThrottlerException: Too Many Requests" }` — the `ThrottlerException` is a string-payload `HttpException` serialized by the built-in `BaseExceptionFilter` (there is **no** `Service Unavailable` payload in 6.5.0); `Retry-After` header in seconds (`blockDuration` defaults to `ttl` = 60 s). Normal responses carry `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` headers.
- **Accepted forms — the coder chooses based on what holds up (hard requirement: a direct 429 assertion):**
  1. **Unit test (safest):** `apps/api/__tests__/app/throttler-guard.test.ts` using `Test.createTestingModule` with a minimal module (a light controller + `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 3 }])` + `ThrottlerGuard` as `APP_GUARD`), `app.init()`, then ~4 supertest requests (`supertest` 7.2.2 is already a dependency) — expect the 4th to return 429 with the payload above. The small limit keeps it fast and deterministic with no shared budget and no real-time TTL waiting. If this form is chosen in isolation, the api suite becomes **51 tests** — update the expected count in task 3.3 and design.md gate 4. The actual final count for this change is **54** because task 2.2 also adds 3 fallback tests.
  2. **E2E test:** `apps/web/e2e/api-rate-limit.spec.ts` following the `api-health.spec.ts` pattern (`test('...')` from Playwright, `request` fixture): send more than 60 requests to a light endpoint (e.g. `/api/v1/health`) within the 60 s TTL and assert that at least one response is 429 (with `Retry-After`). **Shared-budget hazard (verified):** the guard is global (`APP_GUARD`) but buckets are keyed per controller-handler + IP — and `api-health.spec.ts` runs in **all 5 Playwright projects** (chromium-desktop runs every spec; the other four grep `@smoke`, and the API specs are `@smoke`-tagged), so `/health` already receives ~10 hits per full run from the same localhost IP. Once a bucket is tripped it stays blocked for 60 s (`blockDuration` defaults to `ttl`) — any health spec running in that window receives 429 and the suite breaks. If this form is chosen: do **not** tag the new spec `@smoke` (avoids 5× hammering), hammer until the first 429 (do not assume exactly 61 — prior hits may exist in the bucket), isolate it from the other API specs (own Playwright project / grep tag / serial mode — a `playwright.config.ts` tweak for isolation is in scope of this task), and re-verify that the **full** E2E suite passes end-to-end. If the E2E form proves slow or fragile, fall back to the unit form. If this form is chosen, the full-suite spec count in task 3.9's note (49) grows accordingly — update it.
- Zero errors, zero warnings in the new test's output.

**Verification:** The new test deterministically asserts a 429 (status + `ThrottlerException: Too Many Requests` message; `Retry-After` header if asserted) on the Nest 12 app. `npx nx test api` green (**54 tests**: 50 baseline + 1 direct rate-limit coverage + 3 fallback coverage); `npm run e2e` full suite green (accounting for the I17 flake) — proving the new test does not contaminate the other API specs via the shared throttling budget.

---

## Task Group 4 — Documentation updates

### [x] 4.1 README.md (root)

- Tech stack table, NestJS rows: Backend row `11.1.21` → `12.0.1`; Config row (`@nestjs/config`) `4.0.4` → `12.0.0`; API Docs row (`@nestjs/swagger`) `11.4.4` → `12.0.1`.
- Tech stack table, **pre-existing drift corrections (user-approved scope addition — doc-only, no packages are upgraded by this task):** Frontend (Next.js) `16.2.6` → `16.3.4`; UI (React) `19.2.6` → `19.3.0`; E2E (Playwright) `1.60.0` → `1.63.0`; Linting (ESLint) `10.4.0` → `10.10.0`; Formatting (Prettier) `3.8.3` → `3.9.6`.
- **Re-verify each target version against the manifests before writing it** — `apps/web/package.json` for `next`/`react`, root `package.json` for `@playwright/test`/`eslint`/`prettier` (or `npm ls` / `package-lock.json`). The numbers above were confirmed against the manifests on 11 Sep 2026 but must match the installed tree at implementation time.

**Verification:** `grep -nE "12\.0\.1|12\.0\.0|16\.3\.4|19\.3\.0|1\.63\.0|10\.10\.0|3\.9\.6" README.md` shows the eight updated cells; no other version cells changed; every written version matches the corresponding manifest exactly.

### [x] 4.2 apps/api/README.md

- Line 5: `**Framework:** NestJS 11` → `**Framework:** NestJS 12`.
- The cross-cutting concerns table's `abortEarly: true` wording remains accurate after the `libraryOptions` nesting — no change required.

**Verification:** `grep -n "NestJS 1" apps/api/README.md` → only "NestJS 12".

### [x] 4.3 AGENTS.md

- Dependency-scoping rule (~line 282): replace the `swagger-ui-express` example (the package no longer exists in the repo) with another api-only dep — e.g. `@nestjs/*`, `helmet`.
- Dependency Management section: add a short note documenting the deliberate `@nestjs/throttler` 6.5.0 pin — no Nest 12 peer support published as of 11 Sep 2026; validated empirically (unit + E2E); revisit when a throttler release declares Nest 12 peers.

**Verification:** `grep -n "swagger-ui-express" AGENTS.md` → no matches; the throttler note is present and states the pin is deliberate.

### [x] 4.4 ROADMAP.md — D1 completion + D-series renumbering

- Remove the D1 (Upgrade NestJS 11 → 12) block from Mantenimiento / Dependencias.
- Renumber: D2 (Water Footprint Phase 3) → **D1**; D3 (Tooling de release) → **D2**; D4 (TypeScript 7) → **D3** — continuous sequence, no gaps (renumbering rule in the doc's Notas).
- Update **all** cross-references coherently:
  - Status table "Dependencias" row: NestJS 12 applied 11 Sep 2026; audit 32 → recorded count from task 3.8; remaining = release tooling (now D2).
  - Status table "Datos reales" row: `D2` → `D1` (water-footprint reference).
  - P1 problem statement: `ver D2` → `ver D1`.
  - Plan de Acción: remove the D1 NestJS 12 item; renumber the Water Footprint Phase 3 item to D1; update the completion note (NX 23 completed 10 Sep 2026, NestJS 12 completed 11 Sep 2026 — specs `upgrade-nx-23` and `upgrade-nestjs-12` archived; TypeScript 7 now D3, passive follow-up).
  - I01: NestJS family resolved by the NestJS 12 major (`multer` 2.2.0 via platform-express 12.0.1, `js-yaml` 5.4.1 via @nestjs/swagger 12.0.1 — the 11.2.3/11.4.7 patches superseded); update the audit counts; renumber the remaining families' owners (release tooling → D2).
  - `Última actualización` → 11 Sep 2026.

**Verification:** `grep -nE "D4|NestJS \(D1\)|tooling de release \(D3\)" ROADMAP.md` → no stale references; the D-series is continuous D1–D3; audit numbers match the counts recorded in task 3.8.

### [x] 4.5 openspec/config.yaml — sync the stale context block

- Update the `context` block to the actual repo state:
  - `NX v22 monorepo` → `NX v23 monorepo` (intro line)
  - `Node.js: v20 LTS` → `Node.js: v24 LTS`
  - `Monorepo: NX v22` → `Monorepo: NX v23`
  - Apps line: `Tailwind CSS v3` → `Tailwind CSS v4`; `NestJS 11` → `NestJS 12`
  - Styling section: `Tailwind CSS v3 with dark mode class strategy` → `Tailwind CSS v4 with dark mode class strategy`

**Verification:** `grep -nE "v20|v22|NestJS 11|Tailwind CSS v3" openspec/config.yaml` → no matches.

### [x] 4.6 Version-mention sweep

- Run: `grep -rn -E "NestJS 11|11\.1\.21|4\.0\.4|11\.4\.4|16\.2\.6|19\.2\.6|1\.60\.0|10\.4\.0|3\.8\.3" --include="*.md" .` excluding `node_modules/`, `CHANGELOG.md` (generated by semantic-release), and `openspec/changes/archive/` (historical records). The five stale non-NestJS versions were verified to live only in `README.md` as of 11 Sep 2026 — after task 4.1 the sweep should return zero current-state hits for them.
- Fix any hit that describes the **current** state. Historical references to the upgrade itself (e.g., the archived NX 23 proposal deferring NestJS to "D2") are fine as-is.

**Verification:** The sweep returns only intentional/historical mentions.

---

## Definition of Done

- [x] Six `@nestjs/*` pins at exact 12.x (`12.0.1` × 5, `12.0.0` for config); `@nestjs/throttler` still `6.5.0` (documented in AGENTS.md); `swagger-ui-express` gone from the manifest, lockfile, and regenerated `dist/package.json`
- [x] `app.module.ts` uses `validationOptions.libraryOptions`; no other existing source file touched (the new rate-limit test file of task 3.10 is the only addition)
- [x] `npx nx build api`, `npx nx run api:typecheck`, `npx nx test api` (54), `npx nx test shared` (8), `npx nx test web` (221), `npm run lint` — all green; coverage thresholds intact; no snapshot changes
- [x] `npx nx serve api` boots; `/api/v1/health` → 200 `{ "status": "ok" }`; unknown routes → 404 JSON via the fallback controller (`{ success: false, error: "Cannot GET ...", status: 404 }`)
- [x] Swagger UI manually verified with `SWAGGER_ENABLED=true` (user)
- [x] `npm audit`: `multer`/`js-yaml` chains eliminated; before/after counts recorded (32 → 21)
- [x] E2E run by the user; API specs green modulo the pre-existing I17 flake
- [x] Direct rate-limit coverage in place (task 3.10): unit test asserts the 429 with the `ThrottlerException: Too Many Requests` payload from `@nestjs/throttler` 6.5.0 under Nest 12, and the rest of the suites stays green (shared-budget contamination ruled out)
- [x] `README.md` (three NestJS rows + five drift corrections), `apps/api/README.md`, `AGENTS.md`, `ROADMAP.md` (D-series renumbered, I01 updated), `openspec/config.yaml` all updated
- [x] Working tree only — **no commits, no pushes** (awaiting explicit user authorization)
