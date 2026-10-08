import withBundleAnalyzerInit from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

/**
 * packages/shared uses moduleResolution: "bundler" (no .js extensions in
 * re-exports), so Turbopack needs it listed in transpilePackages to compile
 * its TypeScript source and enable full HMR.
 *
 * Note: no WATCHPACK_POLLING needed — the repo lives on the WSL2 ext4
 * filesystem (/home/...) where inotify works natively.
 */
const isDev = process.env.NODE_ENV === 'development';

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === 'true',
});

const baseConfig: NextConfig = {
  trailingSlash: true,
  transpilePackages: ['@eco-metrics/shared'],

  async headers() {
    // NOTE: `unsafe-inline` in script-src is required by Next.js App Router,
    // which injects inline hydration scripts that cannot be nonce-tagged without
    // custom middleware. This should be tightened with nonces once Next.js
    // provides first-class nonce support in the App Router.
    //
    // NOTE: `unsafe-eval` is added in development only. React (Turbopack) uses
    // eval() in dev mode for HMR and call-stack reconstruction. It is never
    // used in production, so the production CSP remains strict.
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";

    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "frame-src 'none'",
      // NOTE: `upgrade-insecure-requests` is production-only. The dev server
      // runs over http://localhost, where the directive has no value.
      ...(isDev ? [] : ['upgrade-insecure-requests']),
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=()',
          },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(baseConfig);
