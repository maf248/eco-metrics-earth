import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getCategoryIcon } from '@/lib/categoryIcon';
import { CATEGORY_DESCRIPTIONS, getCategoryMetadataTitle } from '@/lib/categoryMetadata';
import { CATEGORY_PAGES } from '@/lib/categoryPages';
import { getCategoryTitle } from '@/lib/categoryTitle';
import { isEcoCategory } from '@/lib/isEcoCategory';
import { siteUrl } from '@/lib/siteUrl';
import { buildOpenGraph, buildTwitter } from '@/lib/socialMetadata';
import { ECO_CATEGORIES } from '@eco-metrics/shared';

// Categories with live data (the category page registry) are not pre-rendered: they are
// generated on their first request and then cached by ISR, so `next build` never depends
// on the BFF. Unknown slugs get a real 404 from ./layout.tsx, before any fetch.
export const dynamicParams = true;
export const revalidate = 86400;
// Covers the worst-case BFF fetch (2 attempts x 10 s) within the Vercel Hobby limit.
export const maxDuration = 30;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

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
  const title = getCategoryTitle(category);
  const Icon = getCategoryIcon(category);

  const definition = CATEGORY_PAGES[category];
  const data = definition ? await definition.load() : undefined;
  const Content = definition?.Content;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-start pt-14 px-4"
    >
      <div className="flex flex-col items-center gap-6 mt-14 lg:mt-0">
        <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-well p-4">
          {/* getCategoryIcon returns a stable ref to an existing component — not created during render. */}
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Icon aria-hidden className="w-16 h-16 drop-shadow-icon-lg" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-fg">{title}</h1>
          {!Content && <p className="mt-4 text-fg-secondary">{title} metrics — coming soon.</p>}
        </div>
      </div>
      {Content && <Content data={data} />}
    </main>
  );
}
