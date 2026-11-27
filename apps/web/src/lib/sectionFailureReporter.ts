import * as Sentry from '@sentry/nextjs';

/** A failing section is reported at most once per window: 6 hours, like the API's outage group. */
export const SECTION_REPORT_WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * Reports a failed section read to Sentry, at most once per section and window. A degraded page
 * regenerates every few minutes, so an unthrottled sustained failure would exhaust the project's
 * daily event limit. The state lives per server instance and resets on a cold start.
 */
export function createSectionFailureReporter(
  now: () => number = Date.now,
): (section: string, error: unknown) => void {
  const lastReported = new Map<string, number>();

  return (section, error) => {
    const current = now();
    const last = lastReported.get(section);
    if (last !== undefined && current - last < SECTION_REPORT_WINDOW_MS) {
      return;
    }
    lastReported.set(section, current);
    Sentry.captureException(error, { tags: { section } });
  };
}

export const reportSectionFailure = createSectionFailureReporter();
