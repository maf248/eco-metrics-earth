import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ECO_CATEGORIES } from '@eco-metrics/shared';

import { getCategoryIcon } from '@/lib/categoryIcon';
import { getCategoryTitle } from '@/lib/categoryTitle';
import { siteUrl } from '@/lib/siteUrl';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
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

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-center px-4"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-white/10 p-4">
          <Icon aria-hidden className="w-16 h-16" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white">{title}</h1>
          <p className="mt-4 text-gray-400">{title} metrics — coming soon.</p>
        </div>
      </div>
    </main>
  );
}
