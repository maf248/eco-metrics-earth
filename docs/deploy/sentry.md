# Sentry error tracking (web and API)

Sentry (EU data region, Developer plan: 1 user, 5k errors per month, email alerts, 1 uptime monitor) reports unexpected errors of the web (`eco-metrics-web`) and the API (`eco-metrics-api`). Constants: organization `eco-metrics-earth`, host `https://de.sentry.io`.

The click paths below are those of the Sentry UI at the time of writing. If a label moved, match it by name.

## Why Sentry and Error Reporting

- **Cloud Logging and Error Reporting** keep recording every API 5xx (see section 23 of [`cloud-run.md`](./cloud-run.md)). They are unchanged.
- **Sentry** is an additional view: web server and browser errors (which only reached Vercel logs or nobody), release and environment tagging, alerts and an uptime check.
- Only errors are sent: no tracing, profiling or Session Replay, and no user context set by the app (`sendDefaultPii: false`, so no default PII such as cookies or request bodies). An error event carries its stack trace, the page URL, breadcrumbs of recent navigation, fetch calls, console output and clicks, and browser and OS context. The SDK's default integrations stay on, apart from `BrowserSession`. Sentry still infers the client IP server-side unless the organization setting below is on.

## What is sent and what is not

- Sent: API 5xx (one capture per event group per window, see below), provider outages (one grouped `provider-unavailable` issue), web server render errors (through Next's `onRequestError`) and client render errors (`error.tsx`, `global-error.tsx`).
- Never sent: any 4xx, handled `provider-unavailable` pages on the web (they do not throw), errors whose Next `digest` shows the server already reported them, `ResizeObserver` noise and browser-extension scripts.
- `AllExceptionsFilter` is the only API capture point. It throttles in memory: `provider-unavailable` once per 6 hours per instance, any other `name: message` once per 5 minutes.

## Variables and secrets

| Name                                                 | Where                                   | Kind     | Used by                                          |
| ---------------------------------------------------- | --------------------------------------- | -------- | ------------------------------------------------ |
| `NEXT_PUBLIC_SENTRY_DSN`                             | Vercel env, Production and Preview      | variable | web build (inlined), CSP, browser and server SDK |
| `SENTRY_DSN_API`                                     | GitHub repository variable              | variable | `deploy-api.yml`, becomes Cloud Run `SENTRY_DSN` |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` | Cloud Run env, set by the deploy        | env      | `apps/api`                                       |
| `SENTRY_AUTH_TOKEN`                                  | Vercel env, Production and Preview only | secret   | web source map upload only (the API needs none)  |

DSNs are public by design but they are **variables, not constants in the repo**: the repository is public, and a committed DSN would let forks and local runs send events into the 5k quota. An unset DSN means Sentry is disabled. The organization slug, project slugs and `https://de.sentry.io` are not secrets and live in `apps/web/next.config.ts` and `deploy-api.yml`.

**The token is never pasted into chat, a file or a commit.** No GitHub secret is needed.

## 1. Create the auth token and store the variables

1. In Sentry open **Settings → Developer Settings → Organization Tokens → Create New Token**, name it `eco-metrics-ci` and copy the `sntrys_...` value once (Sentry shows it only at creation). An Organization Auth Token gets the CI scopes (release creation and source map upload) automatically. If the UI offers a personal token instead, it needs only `project:releases` and `org:read`.
2. Vercel: project **Settings → Environment Variables**, add `SENTRY_AUTH_TOKEN` for **Production** and **Preview**, type **Secret**, leave Development unchecked (Vercel stores one row per environment).
3. Vercel: add `NEXT_PUBLIC_SENTRY_DSN` with the `eco-metrics-web` DSN for **Production** and **Preview** (type **Config**, not Secret: it is public and is inlined in the browser bundle). Leave Development unchecked.
4. GitHub: **Settings → Secrets and variables → Actions → Variables → New repository variable**, name `SENTRY_DSN_API`, value the `eco-metrics-api` DSN. One value serves both Cloud Run services.
5. Do this before merging to `develop`. Vercel applies variables only to **new builds**, so redeploy the web after adding or changing `NEXT_PUBLIC_SENTRY_DSN` (a change under the Vercel ignore pattern does not trigger a build by itself). The API needs a new deploy to pick up `SENTRY_DSN_API`.

The deploy sets `SENTRY_ENVIRONMENT` to the deploy target (`production` for `eco-metrics-api`, `development` for `eco-metrics-api-dev`, both in the `eco-metrics-api` project) and `SENTRY_RELEASE` to the commit SHA. The web uses `production` or `preview` from `VERCEL_ENV` and the commit SHA as release.

## 2. Alert rules

Per project, under **Monitors → Alerts**. All email the owner (the only member).

| Rule                                                            | Project           | Trigger                                           | Environment                 | Throttle   |
| --------------------------------------------------------------- | ----------------- | ------------------------------------------------- | --------------------------- | ---------- |
| `Send a notification for high priority issues` (Sentry default) | each              | Sentry marks a new issue as high priority         | web: `production`; api: all | none       |
| `Escalation or regression (web)`                                | `eco-metrics-web` | An issue escalates, or a resolved issue regresses | `production`                | 30 minutes |
| `Escalation or regression (api)`                                | `eco-metrics-api` | An issue escalates, or a resolved issue regresses | all                         | 30 minutes |

"Escalates" is Sentry's own spike detection, so no fixed event-count rule is needed. An environment only appears in the filter after the project receives its first event in it: set the api rules to `production` after its first production event.

## 3. Privacy: do not store IP addresses

In **Settings → Security & Privacy** (organization level) turn on **Prevent Storing of IP Addresses**. Without it Sentry records the browser IP from the ingest request, even with `sendDefaultPii: false`. It applies to every project.

## 4. Quota guards

- **Client-key rate limit** (the daily backstop): **Settings → Projects → project → Client Keys (DSN) → Configure → Rate limit**, set to **80 events per 1 day** in both projects. Even a flood the app-side throttle does not collapse cannot burn the monthly quota.
- **Inbound filters** and **spike protection**: leave on (**Settings → Projects → project → Inbound Filters**; spike protection is on by default).
- **Quota check**: **Stats** in the organization menu shows the monthly usage.

## 5. Uptime monitor

The Developer plan allows one monitor: **Monitors → Uptime → Add Uptime Monitor**, project `eco-metrics-web`, environment `production`, URL `https://eco-metrics-earth.vercel.app/`, `GET`, every 1 minute, timeout 10 s, default assertions (status 200 to 299), assigned to the owner. An issue opens after 3 failed checks and resolves after 1 success.

Why the web: a fully down site produces no errors, so only an uptime check can see it. An API outage already surfaces as web server errors (BFF reads that throw) and as API 5xx events, and the API liveness endpoint is free of provider calls so it would add little signal.

## 6. Stack traces

- **Web**: with `SENTRY_AUTH_TOKEN` set, the Vercel build uploads source maps for the release and deletes them from `.next`, so they are never served. Without a token the plugin is disabled and the build still succeeds.
- **API**: the image starts Node with `--enable-source-maps` (Dockerfile `CMD`), so `Error.stack` shows TypeScript paths from the `main.js.map` shipped in the image. This applies to Sentry and also to the stack in the Cloud Logging entry that Error Reporting groups on. There is no upload and the API needs no token.

## 7. Verify end to end

- **Web**: on the production page, open the browser console and run `setTimeout(() => { throw new Error('sentry-verify') })`. The error appears in `eco-metrics-web` with environment `production` (an ad blocker may block the client request). Its stack shows `<anonymous>` because the code came from the console; errors from the app's own code show mapped source files. Resolve the test issue afterwards.
- **API**: force a provider failure on the dev service; it appears once as `provider-unavailable` in `eco-metrics-api` with environment `development`, and the stack shows `.ts` paths (also in Cloud Logging).
- `/api/v1/health` must still answer `ok` with Sentry enabled.

## Roll back

Unset the variable (`NEXT_PUBLIC_SENTRY_DSN` in Vercel, `SENTRY_DSN_API` in GitHub) and redeploy. Without a DSN the SDK is not initialized and no network call is made.
