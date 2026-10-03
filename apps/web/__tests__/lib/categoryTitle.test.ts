import { getCategoryTitle } from '@/lib/categoryTitle';
import { ECO_CATEGORIES } from '@eco-metrics/shared';

describe('getCategoryTitle', () => {
  it('should return "Waste & Recycling" for waste-recycling', () => {
    expect(getCategoryTitle('waste-recycling')).toBe('Waste & Recycling');
  });

  it('should return the slugified title for a standard slug', () => {
    expect(getCategoryTitle('ocean-health')).toBe('Ocean Health');
  });

  it('should return "CO2 Emissions" for co2-emissions (uppercase formula)', () => {
    expect(getCategoryTitle('co2-emissions')).toBe('CO2 Emissions');
  });

  it('should return the correct title for all ECO_CATEGORY slugs', () => {
    for (const slug of Object.values(ECO_CATEGORIES)) {
      const title = getCategoryTitle(slug);
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    }
    expect(getCategoryTitle(ECO_CATEGORIES.WASTE_RECYCLING)).toBe('Waste & Recycling');
  });
});
