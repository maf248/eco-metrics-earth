# Design: Add CORS Multi-Origin Support

## Context

See proposal.md — Why (I02, blocking for P1.1). Current state facts that shape the approach:

- `CORS_ORIGIN` is validated by Joi 18.2.9 as a single URI (`Joi.string().uri().default('http://localhost:3000')`) inline in `app.module.ts`; a comma-separated value is rejected today (`"must be a valid uri"` — verified empirically against joi 18.2.9).
- `AppConfigService.corsOrigin` returns that string; `main.ts` calls `app.enableCors({ origin: appConfig.corsOrigin })`.
- `@nestjs/common`'s `CorsOptions.origin` natively accepts `boolean | string | RegExp | (string | RegExp)[]` (`StaticOrigin`), and the underlying `cors@2.8.6` (via `@nestjs/platform-express`) already handles arrays and regexes in `isOriginAllowed` — no new dependency, no custom matching code.
- `cors@2.8.6` semantics (verified from the installed source): a **string** origin emits `Access-Control-Allow-Origin: <fixed>` on _every_ response; an **array/RegExp** origin emits ACAO reflecting the request's `Origin` _only on match_ and omits the header otherwise (`applyHeaders` skips falsy values). Both add `Vary: Origin`.
- Joi `.uri()` **accepts** `https://*.vercel.app` (verified) — a trap: the `cors` package does exact string comparison, so such an entry would silently never match. The new per-entry validation must reject `*` explicitly.
- The deploy workflow passes env vars via the multiline `env_vars:` form of `google-github-actions/deploy-cloudrun@v3`. That does **not** protect commas: the action's parser (`parseKVString` in `google-github-actions/actions-utils`) splits entries on newlines **and commas**, with backslash escaping (`\,` → literal comma, `\\` → literal backslash; a lone `\.` loses its backslash). Unescaped, `CORS_ORIGIN=http://a.com,https://b.com` parses as `CORS_ORIGIN=http://a.com` plus a bogus entry keyed `https://b.com` — gcloud rejects the invalid env var name and the deploy fails at the deploy step.
- The gcloud _serialization_ side is already safe: the action's `joinKVStringForGCloud` auto-selects a list delimiter character absent from the values and emits gcloud's `^<delim>^` escaping, so comma-containing values survive that stage. Only the `env_vars` **input parsing** needs escaping.

## Goals / Non-Goals

**Goals:**

- Allow multiple exact origins (localhost + production domain + fixed previews) and one pattern-based origin family (Vercel preview URLs) with zero new dependencies.
- Fail fast at startup on any malformed configuration (bad URI, wildcard, empty entry, unanchored/non-compiling pattern).
- Make the multi-origin value reach Cloud Run intact through the existing deploy workflow.

**Non-Goals** (design-level; scope boundaries are in proposal.md):

- No wildcard/glob semantics inside `CORS_ORIGIN` — exact matching only; patterns are the separate variable.
- No `credentials: true` — no cookies/auth exist; enabling it would be speculative.
- No memoization/caching of parsed config — the getter is read once at bootstrap.

## Decisions

### D1 — Comma-separated exact list + separate optional pattern variable ⚑ flagged for user review

**Decision**: `CORS_ORIGIN` becomes a comma-separated list of exact origins; a new optional `CORS_ORIGIN_PATTERN` holds a single anchored regex for origin families that cannot be enumerated (Vercel previews: `https://<project>-<git-hash>-<scope>.vercel.app` — a new host per commit).

**Rationale**: The list covers enumerable origins; the pattern covers the unenumerable ones. A static list can never track per-commit preview hosts — without the pattern, every preview deploy that calls the BFF from a browser would be blocked (or require a manual list update per deploy, which is operationally absurd). Two variables keep validation orthogonal (per-entry URI checks vs regex anchor/compile checks) with clearer Joi errors than any mixed syntax, and both are individually backward compatible: a single origin is a valid one-entry list, and an absent pattern means exactly today's behavior.

**Alternatives considered**:

- **List-only (no pattern)** — rejected: leaves the preview-URL half of I02 unsolved; the roadmap's own problem statement names preview URLs.
- **Boolean flag (e.g. `CORS_ALLOW_VERCEL_PREVIEWS=true`)** — rejected: hardcodes Vercel's URL scheme inside the API, would match _any_ project's `*.vercel.app` preview (overbroad), and still needs the project slug configured — a hardcoded regex with extra steps.
- **Unified single variable with `pattern:`-prefixed entries** — rejected: a mini-DSL; mixed per-entry validation, worse error messages, and the identical workflow-escaping needs anyway.
- **Origin-matching callback function in `main.ts`** — rejected: reimplements matching the `cors` package performs natively for `(string | RegExp)[]`.

This is the roadmap's open question ("lista separada por comas **o** regex para previews") — the recommendation is **both, as two variables**, and it is the one decision worth the user's explicit sign-off at the approval checkpoint.

### D2 — Pass the parsed array straight to `enableCors({ origin })`

**Decision**: `AppConfigService.corsOrigins` returns `(string | RegExp)[]` — the split/trimmed `CORS_ORIGIN` entries plus the compiled `CORS_ORIGIN_PATTERN` as a `RegExp` (when set). `main.ts` calls `app.enableCors({ origin: appConfig.corsOrigins })`.

**Rationale**: Native `StaticOrigin` support in `@nestjs/common`/`cors@2.8.6`; all parsing/compiling lives in the (unit-testable) config service; `main.ts` stays a dumb wiring step. The getter replaces `corsOrigin` (singular) — the rename is honest: the value's shape changed.

### D3 — Pattern must be anchored (`^...$`) and compilable, enforced at startup

**Decision**: Joi rejects `CORS_ORIGIN_PATTERN` values that do not begin with `^` and end with `$`, or that fail `new RegExp(value)`.

**Rationale**: Unanchored regexes match substrings — e.g. `\.vercel\.app` would match `https://vercel.app.evil.example` — a silent security hole. Anchors are enforced with a clear error rather than auto-added: auto-anchoring silently changes semantics (e.g. it would break a deliberately end-anchored `\.vercel\.app$` by demanding a `^` the user must then write anyway) and hides intent. Every sane origin pattern is naturally anchored; unanchored is almost always a mistake.

### D4 — Joi schema extracted to `apps/api/src/config/env-validation.schema.ts`

**Decision**: Move the inline `validationSchema` object out of `app.module.ts` into an exported const in `config/`, import it in `ConfigModule.forRoot`, then extend it (list rule + pattern rule).

**Rationale**: The schema is currently untestable in isolation (booting `AppModule` per validation case is heavy and env-order-dependent). Extraction enables direct `schema.validate({...})` unit tests for every acceptance/rejection scenario in the specs. It matches the scaffold's `config/ — application configuration` structure, and the `allowUnknown`/`abortEarly` `libraryOptions` (the `@nestjs/config` 12 validation contract per `api-app-scaffold`) are unchanged.

### D5 — Workflow transports values via the action's documented escaping (backslashes first, then commas)

**Decision**: One small step before the deploy step ("Prepare CORS env values for deploy-cloudrun", `id: cors`) that escapes `\` → `\\` **first** and `,` → `\,` **second** (order matters: escaping commas first would double-escape the backslashes it just introduced), and emits step outputs: `origin` (always) and `pattern` (`CORS_ORIGIN_PATTERN=<escaped>` only when the GitHub variable is non-empty). The deploy step's `env_vars` uses the outputs, with `${{ steps.cors.outputs.pattern }}` as its own line — an absent output renders an empty line, which the action's parser skips. The step reads the raw variables via the step's `env:` mapping (not inline `${{ }}` in the script — the injection-safe pattern):

```yaml
- name: Prepare CORS env values for deploy-cloudrun
  id: cors
  env:
    CORS_ORIGIN: ${{ vars.CORS_ORIGIN }}
    CORS_ORIGIN_PATTERN: ${{ vars.CORS_ORIGIN_PATTERN }}
  run: |
    escape() {
      local value="$1"
      value="${value//\\/\\\\}"
      value="${value//,/\\,}"
      printf '%s' "$value"
    }
    {
      echo "origin=$(escape "$CORS_ORIGIN")"
      if [ -n "$CORS_ORIGIN_PATTERN" ]; then
        echo "pattern=CORS_ORIGIN_PATTERN=$(escape "$CORS_ORIGIN_PATTERN")"
      fi
    } >> "$GITHUB_OUTPUT"
```

**Rationale**: Grounded in the verified parser facts (Context). The multiline `env_vars` form alone does not protect commas; the action's documented backslash escaping is the supported mechanism; the gcloud serialization side needs nothing (auto-delimiter selection). Bash parameter expansion avoids sed's own escaping pitfalls.

**Alternatives considered**:

- **`env_vars_file` (YAML)** — rejected: quoted YAML values preserve commas, but `parseKVFile` silently switches to the comma-splitting string parser if any line matches `^.+=.+$` — a future value containing `=` (e.g. base64 padding) would reintroduce the bug — and it adds a generated file artifact to the workflow.
- **Semicolon/space-separated `CORS_ORIGIN`** — rejected: sidesteps the escaping but deviates from the roadmap's comma-list direction and common env-var convention; it just moves the surprise to a format nobody expects.
- **`env_vars_update_strategy: overwrite`** — rejected: makes the workflow authoritative over _all_ service env vars (wiping anything set out-of-band); disproportionate to the problem. Merge is kept; its caveat is handled in D7.

### D6 — ACAO only on matched origins (accepted behavior change), tests updated accordingly

**Decision**: Accept the `cors` package's array-origin semantics: ACAO is emitted only when the request's `Origin` matches an allowed origin (exact or pattern), reflecting the request's own origin; no ACAO otherwise. Update the 4 E2E CORS assertions in `apps/web/e2e/api-health.spec.ts` to send `Origin: http://localhost:3000` and assert the reflection, and add negative cases (unknown origin → header absent; no origin → header absent). Extend `apps/api/__tests__/app/bootstrap.test.ts` with supertest CORS assertions (match → reflected; unknown → absent) so the behavior is covered at unit level too.

**Rationale**: This is correct CORS semantics — the old unconditional emission was an artifact of the single-string configuration. Nothing legitimate consumes ACAO on Origin-less requests (same-origin requests and non-browser clients never evaluate CORS); unknown-origin requests got a header the browser discarded anyway. `Vary: Origin` continues to be emitted (correct for caches).

### D7 — Optional GitHub variable; merge-strategy caveat documented

**Decision**: `CORS_ORIGIN_PATTERN` is an optional sixth repository variable; unset/empty → not passed to the service. Because `deploy-cloudrun` **merges** env vars by default, a pattern deployed earlier persists on the service after the variable is later unset — the runbook's troubleshooting section documents removal via `gcloud run services update eco-metrics-api --remove-env-vars CORS_ORIGIN_PATTERN`.

**Rationale**: Keeps the five required variables and the pre-flight check untouched (backward compatible); the staleness edge case is rare and gets a documented one-command fix rather than a strategy change with broader blast radius (see D5 alternative).

### D8 — Delta scope: three capabilities, deliberately

- `api-security-hardening` owns CORS requirements → the two MODIFIED (validation, AppConfigService) + two ADDED (pattern validation, reflect/omit header behavior) requirements live there.
- `api-cloud-run-deploy` owns the deploy-step env vars, the variables list, and the runbook → three MODIFIED requirements (escaped transport + optional var, optional sixth variable, runbook contents).
- `api-app-scaffold`'s NestJS-12 parity scenario "CORS and security headers unchanged" states ACAO is on every response — now false; it is restated to defer CORS semantics to `api-security-hardening` (the cross-reference style that spec already uses). Its "Environment validation behavior preserved under @nestjs/config 12" requirement is deliberately **left untouched**: its defaults scenario remains true as stated (the four listed vars absent → those defaults apply) and schema-content ownership lives in `api-security-hardening`; touching it would only churn a historical parity statement.

## Risks / Trade-offs

- [Behavior change: ACAO absent on Origin-less requests] → nothing legitimate consumes it; E2E assertions updated to send Origin; negative cases added; unit-level bootstrap assertions added.
- [Regex in an env var is a footgun (unanchored, overbroad, sloppy)] → Joi rejects unanchored/non-compiling values at startup; on Cloud Run that surfaces as a startup-probe failure with the validation error in the service logs (deploy fails loudly, traffic stays on the last healthy revision); the runbook ships a known-good Vercel preview example.
- [Escaping step is invisible glue a future editor might "simplify" away] → the `api-cloud-run-deploy` delta pins the escaping requirement with a deploy-intact scenario; this design records the parser facts with source references.
- [Backslash-eating: a lone `\.` in `env_vars` loses its backslash] → the escape step doubles backslashes before commas; verified against `parseKVString` semantics.
- [Merge-strategy staleness when unsetting the pattern variable] → runbook troubleshooting entry with the `gcloud` clear command (D7).
- [Getter parses on every access] → read once at bootstrap; trivial cost; no memoization (KISS).

## Migration Plan

- Backward compatible by construction: single-origin values remain valid one-entry lists; the Joi default is unchanged; the Cloud Run `CORS_ORIGIN` GitHub variable works as-is for single-origin values; the pattern variable is optional and absent by default.
- Rollout: merge → next deploy (the workflow now escapes, so multi-origin values can be set in the GitHub variable at any time) → optionally set `CORS_ORIGIN_PATTERN` (raw value, no manual escaping — the workflow handles it) → next deploy passes it.
- Rollback of the pattern: unset the GitHub variable **and** clear the service env var (runbook command, D7). Rollback of the list: set the GitHub variable back to a single origin.
- No data migrations; no frontend coordination — server-side fetches never evaluate CORS.

## Open Questions

None deferrable. The one genuine decision — comma list vs list + preview pattern, and its two-variable shape — is D1, flagged for the user's review at the approval checkpoint rather than left open.
