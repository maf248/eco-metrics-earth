import withBundleAnalyzerInit from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

import { ECO_CATEGORIES } from '../../packages/shared/src/lib/eco-category';

import { buildContentSecurityPolicy } from './src/lib/contentSecurityPolicy';

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
  cacheComponents: true,
  partialPrefetching: true,
  trailingSlash: true,
  transpilePackages: ['@eco-metrics/shared'],

  // Inlined at build time for the browser and the server: `production` or `preview` on Vercel,
  // `development` locally, and the commit SHA as the release (omitted outside Vercel).
  env: {
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.VERCEL_ENV ?? 'development',
    ...(process.env.VERCEL_GIT_COMMIT_SHA
      ? { NEXT_PUBLIC_SENTRY_RELEASE: process.env.VERCEL_GIT_COMMIT_SHA }
      : {}),
  },

  async rewrites() {
    // An unknown slug never reaches `[category]`, where a 404 raised while rendering has an empty
    // <body> that needs JavaScript. A path no route matches gets the complete not-found page.
    // Returned as an array, this runs after fixed routes and files, and before dynamic routes.
    // `%` stays out because `[category]` decodes its param: an encoded slug may be a valid one.
    const categories = Object.values(ECO_CATEGORIES).join('|');
    return [
      {
        source: `/:slug((?!(?:${categories})(?:/|$))[^/%]+)/`,
        destination: '/not-found/unknown-category/',
      },
    ];
  },

  async headers() {
    const csp = buildContentSecurityPolicy({
      isDev,
      sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    });

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

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

// Org, projects and the EU host are public constants, not secrets. Without a token the plugin
// uploads nothing and generates no source maps, so local builds and CI are unaffected.
export default withSentryConfig(withBundleAnalyzer(baseConfig), {
  org: 'eco-metrics-earth',
  project: 'eco-metrics-web',
  sentryUrl: 'https://de.sentry.io',
  authToken: sentryAuthToken,
  telemetry: false,
  silent: !process.env.CI,
  release: { name: process.env.VERCEL_GIT_COMMIT_SHA },
  // Errors only: drop tracing, debug logging and replay code from the bundles.
  bundleSizeOptimizations: {
    excludeTracing: true,
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
  // `instrumentation-client.ts` exports no `onRouterTransitionStart` because tracing is off.
  suppressOnRouterTransitionStartWarning: true,
  webpack: {
    autoInstrumentServerFunctions: false,
    autoInstrumentAppDirectory: false,
  },
  // Maps are uploaded and then deleted from `.next`, so they are never served.
  sourcemaps: {
    disable: sentryAuthToken === undefined || sentryAuthToken === '',
    deleteSourcemapsAfterUpload: true,
  },
});
