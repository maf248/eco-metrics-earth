import { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: '*',
        disallow: ['/api/'],
      },
    ],
    sitemap: siteUrl() + '/sitemap.xml',
  };
}
