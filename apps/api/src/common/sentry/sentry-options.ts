/** The Sentry settings read from the environment (all optional; unset disables Sentry). */
export interface SentryEnv {
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
  SENTRY_RELEASE?: string;
}

/**
 * The only options the API passes to `Sentry.init`. Tracing, profiling and Sentry logs are off
 * because none of their options is set; `sendDefaultPii` stays `false`.
 */
export interface SentryApiOptions {
  dsn: string;
  environment?: string;
  release?: string;
  sendDefaultPii: false;
}

function nonEmpty(value: string | undefined): string | undefined {
  return value === undefined || value === '' ? undefined : value;
}

/**
 * Builds the `Sentry.init` options from the environment, or `undefined` when no DSN is set so the
 * SDK is never initialized (no network, `captureException` is a no-op).
 */
export function buildSentryOptions(env: SentryEnv): SentryApiOptions | undefined {
  const dsn = nonEmpty(env.SENTRY_DSN);
  if (dsn === undefined) {
    return undefined;
  }

  const environment = nonEmpty(env.SENTRY_ENVIRONMENT);
  const release = nonEmpty(env.SENTRY_RELEASE);

  return {
    dsn,
    ...(environment !== undefined && { environment }),
    ...(release !== undefined && { release }),
    sendDefaultPii: false,
  };
}
