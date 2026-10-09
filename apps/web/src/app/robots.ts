import { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
  return {
    // No disallow rules: the API is served from its own domain, not this one.
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: siteUrl() + '/sitemap.xml',
  };
}
