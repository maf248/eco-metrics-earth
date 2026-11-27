## Why

Three issues in the isolation of failed category sections, found in review before release:

- A page with a failed section is degraded and regenerates every 5 minutes, and every regeneration reported the same failure to Sentry: about 288 events a day for one sustained failure, far over the web project's 80-events-a-day client-key limit, which would then drop every other web error of that day.
- The category error boundary also catches errors raised in the browser (a chart failing to render), and presented them as "Data temporarily unavailable", which is not what happened.
- On the deforestation page, a failed tree cover loss section left its spacer behind, adding space above the methodology note.

## What Changes

- Failed sections are reported through `reportSectionFailure`, at most once per section every 6 hours per server instance (the window the API uses for provider outages).
- The category boundary shows the data unavailable panel only for server errors (with a `digest`); a browser error keeps the header and "Try again" with a generic "Something went wrong" message.
- The tree cover loss spacing belongs to its section and disappears with it.

## Scope of the throttle

It covers partial failures, which are reported from the page load. A total failure still throws and is reported per failed request by `onRequestError`, unchanged from before (previously any single section error took that path); the client-key rate limit stays the backstop there. The window is per server instance, so concurrent instances or cold starts can each report once per window; section keys are unique across categories, so the key identifies the category too.

## Impact

- Web only: `lib/sectionFailureReporter.ts` (new), `lib/categoryPages.tsx`, `app/[category]/error.tsx`, `DeforestationContent`, unit tests, `docs/design-system.md`, `AGENTS.md`.
- Spec: `category-page-registry`.
