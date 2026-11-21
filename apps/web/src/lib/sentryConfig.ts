/** The Sentry settings the web reads (all optional; no DSN disables Sentry everywhere). */
export interface SentryWebEnv {
  NEXT_PUBLIC_SENTRY_DSN?: string;
  NEXT_PUBLIC_SENTRY_ENVIRONMENT?: string;
  NEXT_PUBLIC_SENTRY_RELEASE?: string;
}

/**
 * The only options passed to `Sentry.init`, in the browser and in the Node.js server runtime.
 * No tracing, profiling, replay or logs option is set, so those features stay off.
 */
export interface SentryWebInitOptions {
  dsn: string;
  environment?: string;
  release?: string;
  sendDefaultPii: false;
  ignoreErrors: string[];
  denyUrls: RegExp[];
  /** Receives the SDK's default integrations (each has a `name`) and returns the ones to keep. */
  integrations: <T extends { name: string }>(defaults: T[]) => T[];
}

/** Browser noise that says nothing about the app: harmless ResizeObserver notifications. */
const IGNORED_ERRORS = [
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications.',
];

/** Scripts injected by browser extensions. */
const DENIED_URLS = [/^chrome-extension:\/\//i, /^moz-extension:\/\//i, /^safari-extension:\/\//i];

function nonEmpty(value: string | undefined): string | undefined {
  return value === undefined || value === '' ? undefined : value;
}

/**
 * Builds the `Sentry.init` options, or `undefined` without a DSN so no SDK is initialized and no
 * network call is made. The default `BrowserSession` integration is removed, so a page view sends
 * nothing unless an error occurs.
 */
export function buildSentryInitOptions(env: SentryWebEnv): SentryWebInitOptions | undefined {
  const dsn = nonEmpty(env.NEXT_PUBLIC_SENTRY_DSN);
  // One rule for init and the CSP: a DSN without a usable https ingest origin disables Sentry.
  if (dsn === undefined || sentryIngestOrigin(dsn) === undefined) {
    return undefined;
  }

  const environment = nonEmpty(env.NEXT_PUBLIC_SENTRY_ENVIRONMENT);
  const release = nonEmpty(env.NEXT_PUBLIC_SENTRY_RELEASE);

  return {
    dsn,
    ...(environment !== undefined && { environment }),
    ...(release !== undefined && { release }),
    sendDefaultPii: false,
    ignoreErrors: IGNORED_ERRORS,
    denyUrls: DENIED_URLS,
    integrations: (defaults) =>
      defaults.filter((integration) => integration.name !== 'BrowserSession'),
  };
}

/**
 * The options for this build. `NEXT_PUBLIC_*` values are inlined by Next only for literal
 * `process.env.NAME` reads, so each one is read explicitly here.
 */
export function getSentryInitOptions(): SentryWebInitOptions | undefined {
  return buildSentryInitOptions({
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    NEXT_PUBLIC_SENTRY_RELEASE: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  });
}

/**
 * The origin events are sent to, `https://<host>` from the DSN, or `undefined` for a missing or
 * invalid DSN. It is the only extra `connect-src` origin the CSP allows.
 */
export function sentryIngestOrigin(dsn: string | undefined): string | undefined {
  if (dsn === undefined || dsn === '') {
    return undefined;
  }

  try {
    const url = new URL(dsn);
    if (url.protocol !== 'https:' || url.hostname === '') {
      return undefined;
    }
    return `https://${url.host}`;
  } catch {
    return undefined;
  }
}
