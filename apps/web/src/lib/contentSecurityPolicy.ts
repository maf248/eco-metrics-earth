import { sentryIngestOrigin } from './sentryConfig';

interface ContentSecurityPolicyOptions {
  isDev: boolean;
  /** `NEXT_PUBLIC_SENTRY_DSN`; its ingest origin is allowed in `connect-src` when it is valid. */
  sentryDsn?: string;
}

/**
 * Builds the `Content-Security-Policy` header value.
 *
 * NOTE: `unsafe-inline` in script-src is required by Next.js App Router, which injects inline
 * hydration scripts that cannot be nonce-tagged without custom middleware. This should be
 * tightened with nonces once Next.js provides first-class nonce support in the App Router.
 *
 * NOTE: `unsafe-eval` is added in development only. React (Turbopack) uses eval() in dev mode for
 * HMR and call-stack reconstruction. It is never used in production, so the production CSP
 * remains strict.
 *
 * `connect-src` gains exactly one origin, the Sentry ingest host from the DSN, and only when a
 * valid DSN is set (never a wildcard).
 */
export function buildContentSecurityPolicy({
  isDev,
  sentryDsn,
}: ContentSecurityPolicyOptions): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
  const ingestOrigin = sentryIngestOrigin(sentryDsn);
  const connectSrc =
    ingestOrigin === undefined ? "connect-src 'self'" : `connect-src 'self' ${ingestOrigin}`;

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob:",
    connectSrc,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    // NOTE: `upgrade-insecure-requests` is production-only. The dev server
    // runs over http://localhost, where the directive has no value.
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}
