import { MetadataRoute } from 'next';

import { LIVE_CATEGORIES } from '@/lib/liveCategories';
import { siteUrl } from '@/lib/siteUrl';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();

  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: base + '/',
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  };

  // Placeholder categories are `noindex`, so they are not listed.
  const categoryEntries: MetadataRoute.Sitemap = LIVE_CATEGORIES.map((slug) => ({
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
