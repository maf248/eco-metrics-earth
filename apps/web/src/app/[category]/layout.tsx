import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { isEcoCategory } from '@/lib/isEcoCategory';

interface CategoryLayoutProps {
  children: ReactNode;
  params: Promise<{ category: string }>;
}

// Rejects unknown slugs before any data is read. Under `ensureStatic` they get a real 404.
export default async function CategoryLayout({ children, params }: CategoryLayoutProps) {
  const { category } = await params;
  if (!isEcoCategory(category)) {
    notFound();
  }
  return children;
}
