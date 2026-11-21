import * as Sentry from '@sentry/nextjs';

import { getSentryInitOptions } from '@/lib/sentryConfig';

/**
 * Initializes the server SDK for the Node.js runtime only (the web has no edge routes or
 * middleware). Without a DSN nothing is initialized and no network call is made.
 */
export function register(): void {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const options = getSentryInitOptions();
  if (options !== undefined) {
    Sentry.init(options);
  }
}

/** Next's own hook reports errors from Server Components and route handlers, once. */
export const onRequestError = Sentry.captureRequestError;
