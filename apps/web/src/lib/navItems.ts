import { ECO_CATEGORIES, type EcoCategory } from '@eco-metrics/shared';
import type React from 'react';

import { getCategoryIcon } from './categoryIcon';
import { getCategoryTitle } from './categoryTitle';

interface NavItem {
  slug: EcoCategory;
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export const NAV_ITEMS: NavItem[] = Object.values(ECO_CATEGORIES).map((slug) => ({
  slug,
  label: getCategoryTitle(slug),
  href: `/${slug}/`,
  icon: getCategoryIcon(slug),
}));
