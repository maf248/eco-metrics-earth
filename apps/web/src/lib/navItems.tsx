import { ECO_CATEGORIES, type EcoCategory } from '@eco-metrics/shared';

import { getCategoryIcon } from './categoryIcon';
import { getCategoryTitle } from './categoryTitle';

export interface NavItem {
  slug: EcoCategory;
  label: string;
  href: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = Object.values(ECO_CATEGORIES).map((slug) => ({
  slug,
  label: getCategoryTitle(slug),
  href: `/${slug}/`,
  icon: getCategoryIcon(slug),
}));
