import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CATEGORY_PAGE_CLASS_NAME, CategoryHeader } from '@/components/CategoryHeader';
import { CATEGORY_DESCRIPTIONS, getCategoryMetadataTitle } from '@/lib/categoryMetadata';
import { CATEGORY_PAGES, loadCategoryData } from '@/lib/categoryPages';
import { isEcoCategory } from '@/lib/isEcoCategory';
import { siteUrl } from '@/lib/siteUrl';
import { buildOpenGraph, buildTwitter } from '@/lib/socialMetadata';
import { ECO_CATEGORIES } from '@eco-metrics/shared';

// Covers the worst-case BFF fetch (2 attempts x 10 s) within the Vercel Hobby limit.
export const maxDuration = 30;
// Every request gets the complete page: no fallback, so a crawler reads all of it in the HTML,
// an unknown slug is a real 404, and the first visit after a deploy waits for the render.
// There is deliberately no <Suspense> here: React moves any boundary over 12.8 KB out of the
// visible document. The instant header and skeletons of a client navigation are NavigationContent.
export const ensureStatic = 'navigation';
export const instant = false;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

/**
 * Categories with live data are not listed: they are generated on demand and then cached,
 * so `next build` never depends on the BFF. The list must keep at least one slug.
 */
export async function generateStaticParams(): Promise<{ category: string }[]> {
  return Object.values(ECO_CATEGORIES)
    .filter((slug) => !CATEGORY_PAGES[slug])
    .map((slug) => ({ category: slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  if (!isEcoCategory(category)) {
    notFound();
  }
  const title = getCategoryMetadataTitle(category);
  const description = CATEGORY_DESCRIPTIONS[category];
  const canonicalUrl = `${siteUrl()}/${category}/`;
  return {
    title: title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: buildOpenGraph({
      title,
      description,
      url: canonicalUrl,
    }),
    twitter: buildTwitter({
      title,
      description,
    }),
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  if (!isEcoCategory(category)) {
    notFound();
  }

  const definition = CATEGORY_PAGES[category];
  const data = definition ? await loadCategoryData(category) : undefined;
  const Content = definition?.Content;

  return (
    <div className={CATEGORY_PAGE_CLASS_NAME}>
      <CategoryHeader category={category} />
      {Content && <Content data={data} />}
    </div>
  );
}
