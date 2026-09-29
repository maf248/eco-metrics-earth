# Add CORS Multi-Origin Support

## Why

The API accepts exactly one CORS origin: `CORS_ORIGIN` is validated by Joi as a single URI (`Joi.string().uri()`) and passed to `enableCors({ origin: <string> })`. The deployed topology needs several at once — local development (`http://localhost:3000`), the Vercel production domain, and Vercel preview deployments (`https://<project>-<hash>-<scope>.vercel.app`, a new host per commit). A single-origin variable cannot express this, and the current schema actively rejects comma-separated values (`"must be a valid uri"`). ROADMAP.md tracks this as **I02** and marks it **blocking for P1.1**, when the deployed frontend starts consuming the BFF — it must land before that.

## What Changes

- **`CORS_ORIGIN` migrates from a single URI to a comma-separated list of exact origins** (backward compatible: a single origin remains a valid one-entry list; the default stays `http://localhost:3000`). Each entry is validated at startup as a URI; wildcard entries (e.g. `https://*.vercel.app`) and empty entries (trailing/doubled commas) are rejected with clear errors.
- **New optional env var `CORS_ORIGIN_PATTERN`**: a single anchored (`^...$`) regular expression matched against the request `Origin` header — the mechanism for Vercel preview URLs, which are ephemeral and cannot be enumerated in a static list. Absent/empty means no pattern (current behavior). Unanchored or non-compiling values fail startup.
- **`AppConfigService.corsOrigin` (string) is replaced by `corsOrigins`** — a `(string | RegExp)[]` getter returning the parsed exact origins plus the compiled pattern. `main.ts` passes the array to `enableCors({ origin })` (native `cors` package support for `(string | RegExp)[]` — no new dependencies).
- **Behavior change (response headers)**: with an array origin, `Access-Control-Allow-Origin` is emitted only when the request's `Origin` header matches an allowed origin (exact entry or pattern), reflecting the request's own origin. Requests with no `Origin` header (curl, health probes) or an unknown origin receive no ACAO header — today the fixed string is emitted unconditionally. The E2E CORS assertions in `apps/web/e2e/api-health.spec.ts` are updated to send `Origin` headers, plus new unknown-origin and no-origin rejection cases.
- **Deploy workflow transport**: `deploy-cloudrun@v3`'s `env_vars` input splits values on commas as well as newlines (verified in the action's parser), so a comma-containing `CORS_ORIGIN` breaks the current deploy. A small workflow step escapes `\` and `,` per the action's documented escaping rules and passes `CORS_ORIGIN_PATTERN` when the optional GitHub variable is set.
- **Docs sync** (AGENTS.md rule): `apps/api/.env.example`, the Environment Variables tables in root `README.md` and `apps/api/README.md`, and the `docs/deploy/cloud-run.md` runbook (variables table, escaping note, troubleshooting entries).

## Non-Goals / Out of scope

- No P1 data-layer work (OWID client, caching, category modules) — this change only unblocks P1.1.
- No frontend changes beyond the CORS assertions in `apps/web/e2e/api-health.spec.ts` (no pages, components, or fetching logic).
- No auth/security work beyond CORS origins: `credentials` stays unset (no cookies/auth exist), no new security headers, no CSP changes.
- No new API endpoints and no change to any endpoint's response body contract — only CORS response headers change.
- No wildcard/glob syntax inside `CORS_ORIGIN` (exact origins only; patterns belong to `CORS_ORIGIN_PATTERN`).
- No Vercel-specific logic in the API (no hardcoded `*.vercel.app` matching — the pattern is a generic regex).
- No change to the five required GitHub variables or the pre-flight check (`CORS_ORIGIN_PATTERN` is an optional sixth; unset = not passed).
- No staging environment work (I01 stays backlog).

## Capabilities

### New Capabilities

(none — all affected behavior belongs to existing capabilities)

### Modified Capabilities

- `api-security-hardening`: the two CORS requirements change — `CORS_ORIGIN` validation becomes a per-entry-validated comma list (rejecting wildcards and empty entries, defaulting to the local origin), and the `AppConfigService` getter returns the parsed `(string | RegExp)[]` array. Two requirements are added: `CORS_ORIGIN_PATTERN` validation (optional, anchored, compilable) and the reflect-on-match / omit-for-unknown CORS header behavior.
- `api-cloud-run-deploy`: the deploy-step requirement gains escaped transport of comma-containing `CORS_ORIGIN` and the optional `CORS_ORIGIN_PATTERN` env var; the GitHub-variables requirement documents the optional sixth variable; the runbook requirement gains the pattern variable, the escaping note, and two troubleshooting entries.
- `api-app-scaffold`: the NestJS 12 regression-proofing requirement's CORS scenario is restated — ACAO is no longer emitted on every response unconditionally, but per the allowed-origins matching owned by `api-security-hardening` (the current scenario text would otherwise contradict the new behavior).

## Impact

- **Code**: `apps/api/src/config/app-config.service.ts` (getter migration), `apps/api/src/app/app.module.ts` (Joi schema extracted to `apps/api/src/config/env-validation.schema.ts` for unit-testability, then extended), `apps/api/src/main.ts` (array origin), `.github/workflows/deploy-api.yml` (escaping step + optional pattern variable).
- **Tests**: `apps/api/__tests__/config/app-config.service.test.ts` (getter), new `apps/api/__tests__/config/env-validation.schema.test.ts` (Joi schema), `apps/api/__tests__/app/bootstrap.test.ts` (CORS header assertions), `apps/web/e2e/api-health.spec.ts` (Origin headers + rejection cases).
- **Docs**: `apps/api/.env.example`, root `README.md`, `apps/api/README.md`, `docs/deploy/cloud-run.md`.
- **Dependencies**: none — uses the `cors` package's native `(string | RegExp)[]` origin support (already in the tree via `@nestjs/platform-express`, `cors@2.8.6`).
- **Runtime behavior**: multi-origin and preview-pattern allowance; ACAO only on matched origins. Existing single-origin deployments are unaffected — a single origin is a valid list, and the Cloud Run `CORS_ORIGIN` GitHub variable keeps working as-is for single-origin values.
