import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { isEcoCategory } from '@/lib/isEcoCategory';

interface CategoryLayoutProps {
  children: ReactNode;
  params: Promise<{ category: string }>;
}

// Rejects unknown slugs here, above the loading.tsx Suspense boundary, so they get a
// real 404 status: with dynamicParams = true they are rendered on demand, and a
// notFound() inside the page would fire after the response started streaming as 200.
export default async function CategoryLayout({ children, params }: CategoryLayoutProps) {
  const { category } = await params;
  if (!isEcoCategory(category)) {
    notFound();
  }
  return children;
}
