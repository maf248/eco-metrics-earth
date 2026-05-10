import { MetadataRoute } from 'next';

import { ECO_CATEGORIES } from '@eco-metrics/shared';

import { siteUrl } from '@/lib/siteUrl';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();

  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: base + '/',
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  };

  const categoryEntries: MetadataRoute.Sitemap = Object.values(ECO_CATEGORIES).map((slug) => ({
    url: `${base}/${slug}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [homeEntry, ...categoryEntries];
}
