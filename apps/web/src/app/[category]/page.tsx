import type { Metadata } from 'next';
import Image from 'next/image';

import { getCategoryIcon } from '@/lib/categoryIcon';
import { getCategoryTitle } from '@/lib/categoryTitle';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const title = getCategoryTitle(category);
  return {
    title: `${title} — eco-metrics earth`,
    description: `Track and visualize ${title.toLowerCase()} metrics for a sustainable planet.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const title = getCategoryTitle(category);
  const icon = getCategoryIcon(category);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-white/10 p-4">
          <Image src={icon} alt={title} width={64} height={64} />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white">{title}</h1>
          <p className="mt-4 text-gray-400">{title} metrics — coming soon.</p>
        </div>
      </div>
    </main>
  );
}
