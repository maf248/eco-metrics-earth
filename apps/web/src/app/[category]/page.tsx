import { ECO_CATEGORIES } from '@eco-metrics/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { WaterFootprintContent } from '@/components/water-footprint/WaterFootprintContent';
import { getCategoryIcon } from '@/lib/categoryIcon';
import { getCategoryTitle } from '@/lib/categoryTitle';
import { siteUrl } from '@/lib/siteUrl';
import { getWaterFootprintProducts } from '@/lib/water-footprint';

export const dynamicParams = false;
export const revalidate = 86400;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams(): Promise<{ category: string }[]> {
  return Object.values(ECO_CATEGORIES).map((slug) => ({ category: slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  if (!(Object.values(ECO_CATEGORIES) as string[]).includes(category)) {
    notFound();
  }
  const title = getCategoryTitle(category);
  const description = `Track and visualize ${title.toLowerCase()} metrics for a sustainable planet.`;
  const canonicalUrl = `${siteUrl()}/${category}/`;
  return {
    title: title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  if (!(Object.values(ECO_CATEGORIES) as string[]).includes(category)) {
    notFound();
  }
  const title = getCategoryTitle(category);
  const Icon = getCategoryIcon(category);

  const isWaterFootprint = category === ECO_CATEGORIES.WATER_FOOTPRINT;
  const { products, fetchFailed } = isWaterFootprint
    ? await getWaterFootprintProducts()
    : { products: [], fetchFailed: false };

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-start pt-14 px-4"
    >
      <div className="flex flex-col items-center gap-6 mt-14 lg:mt-0">
        <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-gray-300 dark:bg-white/10 p-4">
          {/* getCategoryIcon returns a stable ref to an existing component — not created during render. */}
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Icon
            aria-hidden
            className="w-16 h-16 drop-shadow-lg dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.25)]"
          />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {!isWaterFootprint && (
            <p className="mt-4 text-gray-600 dark:text-gray-400">{title} metrics — coming soon.</p>
          )}
        </div>
      </div>
      {isWaterFootprint && (
        <div className="mt-8 w-full flex justify-center">
          <WaterFootprintContent products={products} fetchFailed={fetchFailed} />
        </div>
      )}
    </main>
  );
}
