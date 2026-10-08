import type { Metadata } from 'next';

type OpenGraph = NonNullable<Metadata['openGraph']>;
type Twitter = NonNullable<Metadata['twitter']>;

export const SITE_NAME = 'eco-metrics earth';

/**
 * Site-wide social card, served by `app/og-image.png/route.tsx`.
 *
 * The `.png` path is deliberate: with `trailingSlash: true`, Next.js redirects
 * extensionless routes (including the `opengraph-image` file convention) with
 * a 308, and some social scrapers do not follow redirects for preview images.
 */
export const OG_IMAGE = {
  url: '/og-image.png',
  width: 1200,
  height: 630,
  alt: 'eco-metrics earth — Track and visualize environmental metrics',
  type: 'image/png',
} as const;

/**
 * Next.js merges `metadata` across segments shallowly: a page that declares
 * `openGraph` or `twitter` replaces the layout's object entirely. Every
 * segment builds them through these helpers so the shared fields (type,
 * site name, image, card) are never lost.
 */
export function buildOpenGraph(fields: OpenGraph = {}): OpenGraph {
  return {
    type: 'website',
    siteName: SITE_NAME,
    images: [OG_IMAGE],
    ...fields,
  };
}

export function buildTwitter(fields: Twitter = {}): Twitter {
  // `twitter.images` stays unset: Next.js fills it from the Open Graph images.
  return {
    card: 'summary_large_image',
    ...fields,
  };
}
