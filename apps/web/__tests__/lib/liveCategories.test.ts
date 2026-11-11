import {
  LIVE_CATEGORIES,
  LIVE_CATEGORY_SUMMARIES,
  SUMMARY_MAX_LENGTH,
  isLiveCategory,
} from '@/lib/liveCategories';
import { ECO_CATEGORIES } from '@eco-metrics/shared';

describe('isLiveCategory', () => {
  it('should be true for a category with live data', () => {
    expect(isLiveCategory('co2-emissions')).toBe(true);
  });

  it('should be false for a placeholder category', () => {
    expect(isLiveCategory('ocean-health')).toBe(false);
  });
});

describe('LIVE_CATEGORIES', () => {
  it('should list the categories with live data in navigation order', () => {
    expect(LIVE_CATEGORIES).toEqual([
      'global-temperature',
      'co2-emissions',
      'energy-sources',
      'water-footprint',
    ]);
  });

  it('should keep the order of ECO_CATEGORIES', () => {
    const navigationOrder = Object.values(ECO_CATEGORIES);
    const positions = LIVE_CATEGORIES.map((category) => navigationOrder.indexOf(category));

    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

describe('LIVE_CATEGORY_SUMMARIES', () => {
  it('should hold a summary for every live category and for no other', () => {
    expect(Object.keys(LIVE_CATEGORY_SUMMARIES).sort()).toEqual([...LIVE_CATEGORIES].sort());
  });

  it('should keep every summary short enough for a card', () => {
    for (const summary of Object.values(LIVE_CATEGORY_SUMMARIES)) {
      expect(summary.length).toBeGreaterThan(0);
      expect(summary.length).toBeLessThanOrEqual(SUMMARY_MAX_LENGTH);
    }
  });
});
