# Proposal: Sentry error tracking for the web and the API

## Why

The structured-logging change gave the API JSON logs in Cloud Logging and automatic Cloud Error Reporting groups for every 5xx. Two gaps remain:

1. **The web has no error visibility.** Server render failures on Vercel (for example a BFF read that fails after both attempts) only reach Vercel logs, and browser errors reach nobody. `apps/web/src/app/error.tsx` still carries the comment "Log the error to an error reporting service in production" and only calls `console.error`.
2. **Stack traces are bundled.** The API stack points at `main.js`, and the web has no uploaded source maps, so neither maps back to the TypeScript sources.

Sentry (EU data region, Developer plan: 1 user, 5k errors per month, email alerts, 1 uptime monitor) closes both gaps with one place to see web and API errors, release and environment tagging, and an uptime check on the production site.

## Goals

- Report **unexpected server and client errors** of `apps/web` (Next.js on Vercel) to the Sentry project `eco-metrics-web`.
- Report **5xx outcomes** of `apps/api` (NestJS on Cloud Run) to the Sentry project `eco-metrics-api`, from the single place that already owns 5xx handling (`AllExceptionsFilter`), without changing its Cloud Logging entry.
- Tag every event with an **environment** (`production`, `preview`/`development`) and a **release** equal to the commit SHA.
- Map stack traces to the TypeScript sources: upload web source maps on the Vercel build (not served publicly) and start the API image with `node --enable-source-maps`, which also improves the Cloud Logging stacks.
- Protect the **5k errors per month** quota: never send 4xx, collapse provider outages (502) into one grouped, throttled signal, and throttle repeats of everything else.
- Keep the SDK **disabled and network-free** whenever no DSN is configured (Jest, Playwright E2E, forks, local development).
- Document, as a runbook, the manual Sentry configuration that cannot be code: auth token, alert rules, client-key rate limits and the single free uptime monitor.

## Non-Goals

- No tracing, performance monitoring, profiling, Session Replay, Sentry Logs, cron monitors or user feedback widget. Errors only.
- No personal data: `sendDefaultPii` stays `false`; no user context, cookies, IPs or request bodies are attached by the app.
- No Sentry `tunnelRoute` (events go straight to the EU ingest host; see design).
- No Edge runtime instrumentation (the web has no middleware/proxy and no edge routes).
- No replacement of the pino logger or of the Cloud Error Reporting path: both stay as they are; Sentry is additional.
- No `SentryModule` / `SentryGlobalFilter` from `@sentry/nestjs`: one capture point only.
- No new user-visible feature or copy change; the only visible difference is a minimal root-level fallback page where Next's default one was shown before.
- No metrics, OpenTelemetry or Axiom work.
- No Sentry project/org administration through code (projects, members, alert rules and the uptime monitor are created by hand and documented).
- No Sentry source map upload for the API, no Sentry auth token outside Vercel, no GitHub Environments, no Sentry-Vercel or Sentry-GitHub marketplace integrations.

## Impact

**API (`apps/api`)**

- New dependency `@sentry/nestjs`; new `src/instrument.ts` imported first by `main.ts`; new `common/sentry/` helpers (options builder, event-group throttle).
- `AllExceptionsFilter` captures 5xx to Sentry (once) and awaits a bounded flush; its log entry is unchanged.
- `env-validation.schema.ts` gains optional `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`.
- `deploy-api.yml` passes the DSN variable, environment and release (commit SHA) to Cloud Run. The `Dockerfile` `CMD` gains `--enable-source-maps`. No `ci.yml` or secret changes.

**Web (`apps/web`)**

- New dependency `@sentry/nextjs`; new `src/instrumentation.ts`, `src/instrumentation-client.ts`, `src/app/global-error.tsx`, `src/lib/sentryConfig.ts`, `src/lib/contentSecurityPolicy.ts`.
- `next.config.ts` wraps the config with `withSentryConfig`, inlines environment/release and builds the CSP through the new helper (adds the ingest origin to `connect-src` only when a DSN is set).
- `src/app/error.tsx` reports client-originated errors instead of only logging them.

**Repo and docs**

- New `docs/deploy/sentry.md` runbook; updates to `docs/deploy/cloud-run.md`, `docs/deploy/vercel.md`, both `.env.example` files, `README.md`, `AGENTS.md` and `ROADMAP.md`.

**Specs**

- ADDED capabilities `api-error-tracking`, `web-error-tracking`, `error-tracking-runbook`.
- MODIFIED `web-security-headers` (CSP `connect-src`).
