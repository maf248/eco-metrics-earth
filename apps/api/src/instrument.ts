// This file must stay the first import of `main.ts`: Sentry has to be initialized before the
// framework modules load. It reads `process.env` directly because Nest's config module does not
// exist yet; the Joi schema still validates the same variables at boot.
// TypeScript stack frames come from `node --enable-source-maps` in the Dockerfile `CMD`: enabling
// source maps from code has no effect on the single, already-loaded webpack bundle.
import * as Sentry from '@sentry/nestjs';

import { buildSentryOptions } from './common/sentry/sentry-options';

const options = buildSentryOptions(process.env);
if (options !== undefined) {
  Sentry.init(options);
}
