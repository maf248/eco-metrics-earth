import { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/siteUrl';
import { ECO_CATEGORIES } from '@eco-metrics/shared';

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

  const dataSourcesEntry: MetadataRoute.Sitemap[number] = {
    url: `${base}/data-sources/`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  };

  return [homeEntry, ...categoryEntries, dataSourcesEntry];
}
