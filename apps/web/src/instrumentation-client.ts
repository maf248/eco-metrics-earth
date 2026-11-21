import * as Sentry from '@sentry/nextjs';

import { getSentryInitOptions } from '@/lib/sentryConfig';

// Errors only: no tracing, Session Replay or feedback integration is added. Runs before hydration.
const options = getSentryInitOptions();
if (options !== undefined) {
  Sentry.init(options);
}
