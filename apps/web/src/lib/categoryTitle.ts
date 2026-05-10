import { slugToTitle } from './slugToTitle';

/**
 * Overrides for slugs whose title cannot be derived mechanically from the slug.
 * e.g. 'waste-recycling' → 'Waste & Recycling' (the '&' is not encodable in a slug).
 * e.g. 'co2-emissions' → 'CO2 Emissions' (the slug-to-title conversion produces 'Co2').
 */
const TITLE_OVERRIDES: Record<string, string> = {
  'waste-recycling': 'Waste & Recycling',
  'co2-emissions': 'CO2 Emissions',
};

export function getCategoryTitle(slug: string): string {
  return TITLE_OVERRIDES[slug] ?? slugToTitle(slug);
}
