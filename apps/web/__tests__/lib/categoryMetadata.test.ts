import { CATEGORY_DESCRIPTIONS, getCategoryMetadataTitle } from '@/lib/categoryMetadata';
import { getCategoryTitle } from '@/lib/categoryTitle';
import { SITE_DESCRIPTION } from '@/lib/socialMetadata';
import { ECO_CATEGORIES, type EcoCategory } from '@eco-metrics/shared';

const CATEGORIES: EcoCategory[] = Object.values(ECO_CATEGORIES);
const PLACEHOLDERS = CATEGORIES.filter((slug) => slug !== ECO_CATEGORIES.WATER_FOOTPRINT);

describe('CATEGORY_DESCRIPTIONS', () => {
  it.each(CATEGORIES)('should have a 110-160 character description for %s', (slug) => {
    const length = CATEGORY_DESCRIPTIONS[slug].length;
    expect(length).toBeGreaterThanOrEqual(110);
    expect(length).toBeLessThanOrEqual(160);
  });

  it('should have 12 distinct descriptions that differ from the site description', () => {
    const values = CATEGORIES.map((slug) => CATEGORY_DESCRIPTIONS[slug]);
    expect(CATEGORIES).toHaveLength(12);
    expect(new Set(values).size).toBe(12);
    expect(values).not.toContain(SITE_DESCRIPTION);
  });

  it.each(PLACEHOLDERS)('should state that the data is coming for placeholder %s', (slug) => {
    expect(CATEGORY_DESCRIPTIONS[slug]).toMatch(/coming soon|coming to eco-metrics earth/);
  });
});

describe('getCategoryMetadataTitle', () => {
  it('should return the keyword-bearing override for water-footprint', () => {
    expect(getCategoryMetadataTitle('water-footprint')).toBe('Water Footprint of Food & Products');
  });

  it.each(PLACEHOLDERS)('should return the category name for %s', (slug) => {
    expect(getCategoryMetadataTitle(slug)).toBe(getCategoryTitle(slug));
  });
});
