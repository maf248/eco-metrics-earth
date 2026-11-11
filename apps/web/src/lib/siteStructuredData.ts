import { SITE_DESCRIPTION, SITE_NAME } from './socialMetadata';

/** Raster logo for search engines, which do not take an SVG: the 180×180 touch icon. */
const LOGO_PATH = '/icons/apple-touch-icon.png';

/**
 * schema.org `Organization` and `WebSite` for the home page, as one graph: the site names
 * its publisher by `@id`, so both nodes describe the same entity once.
 *
 * @param baseUrl Canonical site URL with no trailing slash (`siteUrl()`).
 */
export function buildSiteJsonLd(baseUrl: string): Record<string, unknown> {
  const homeUrl = `${baseUrl}/`;
  const organizationId = `${homeUrl}#organization`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: SITE_NAME,
        url: homeUrl,
        logo: `${baseUrl}${LOGO_PATH}`,
      },
      {
        '@type': 'WebSite',
        '@id': `${homeUrl}#website`,
        name: SITE_NAME,
        url: homeUrl,
        description: SITE_DESCRIPTION,
        inLanguage: 'en',
        publisher: { '@id': organizationId },
      },
    ],
  };
}
