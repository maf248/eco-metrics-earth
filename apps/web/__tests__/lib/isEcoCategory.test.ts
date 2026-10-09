import { isEcoCategory } from '@/lib/isEcoCategory';
import { ECO_CATEGORIES } from '@eco-metrics/shared';

describe('isEcoCategory', () => {
  it('should return true for every known category slug', () => {
    for (const slug of Object.values(ECO_CATEGORIES)) {
      expect(isEcoCategory(slug)).toBe(true);
    }
  });

  it('should return false for an unknown slug', () => {
    expect(isEcoCategory('unknown-category')).toBe(false);
  });

  it('should return false for a category key instead of its slug', () => {
    expect(isEcoCategory('WATER_FOOTPRINT')).toBe(false);
  });
});
