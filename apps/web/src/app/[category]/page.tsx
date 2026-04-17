import type { Metadata } from 'next';

import { slugToTitle } from '@/lib/slugToTitle';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const title = slugToTitle(category);
  return {
    title: `${title} — eco-metrics earth`,
    description: `Track and visualize ${title.toLowerCase()} metrics for a sustainable planet.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const title = slugToTitle(category);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-950 px-4">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{title}</h1>
      <p className="mt-4 text-gray-500 dark:text-gray-400">{title} metrics — coming soon.</p>
    </main>
  );
}
