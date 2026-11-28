import { MetadataRoute } from 'next';
import { connection } from 'next/server';

import { getCategoryLastModified } from '@/lib/categoryPages';
import { LIVE_CATEGORIES } from '@/lib/liveCategories';
import { siteUrl } from '@/lib/siteUrl';

// Covers the worst-case BFF read of a category (2 attempts x 10 s), as the category page does.
export const maxDuration = 30;

/** The latest of the known dates, or `undefined` when none is known. */
function latestDate(dates: readonly (Date | undefined)[]): Date | undefined {
  return dates.reduce<Date | undefined>(
    (latest, date) => (date && (!latest || date > latest) ? date : latest),
    undefined,
  );
}

/**
 * Every `lastModified` is the date of the data a page shows, never the request time: an entry
 * whose date is unknown omits it. Rendered per request (`connection()`) so `next build` never
 * reads the BFF; the reads are the pages' own cached reads.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = siteUrl();

  const categoryDates = await Promise.all(LIVE_CATEGORIES.map(getCategoryLastModified));
  const siteLastModified = latestDate(categoryDates);
  const withDate = (date: Date | undefined) => (date ? { lastModified: date } : {});

  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: base + '/',
    ...withDate(siteLastModified),
    changeFrequency: 'weekly',
    priority: 1.0,
  };

  // Placeholder categories are `noindex`, so they are not listed.
  const categoryEntries: MetadataRoute.Sitemap = LIVE_CATEGORIES.map((slug, index) => ({
    url: `${base}/${slug}/`,
    ...withDate(categoryDates[index]),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const dataSourcesEntry: MetadataRoute.Sitemap[number] = {
    url: `${base}/data-sources/`,
    ...withDate(siteLastModified),
    changeFrequency: 'monthly',
    priority: 0.5,
  };

  return [homeEntry, ...categoryEntries, dataSourcesEntry];
}
