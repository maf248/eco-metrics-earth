import { ECO_CATEGORIES, type EcoCategory } from '@eco-metrics/shared';

const CATEGORY_SLUGS: readonly string[] = Object.values(ECO_CATEGORIES);

/** Whether `slug` is one of the known eco-category route slugs. */
export function isEcoCategory(slug: string): slug is EcoCategory {
  return CATEGORY_SLUGS.includes(slug);
}
