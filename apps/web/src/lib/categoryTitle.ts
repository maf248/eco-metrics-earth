import { slugToTitle } from './slugToTitle';

/**
 * Overrides for slugs whose title cannot be derived mechanically from the slug.
 * e.g. 'waste-recycling' → 'Waste & Recycling' (the '&' is not encodable in a slug).
 */
const TITLE_OVERRIDES: Record<string, string> = {
  'waste-recycling': 'Waste & Recycling',
};

export function getCategoryTitle(slug: string): string {
  return TITLE_OVERRIDES[slug] ?? slugToTitle(slug);
}
