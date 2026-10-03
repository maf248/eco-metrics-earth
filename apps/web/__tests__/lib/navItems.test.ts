import { NAV_ITEMS } from '@/lib/navItems';
import { ECO_CATEGORIES } from '@eco-metrics/shared';

describe('NAV_ITEMS', () => {
  it('should have exactly one item per ECO_CATEGORY', () => {
    expect(NAV_ITEMS.length).toBe(Object.values(ECO_CATEGORIES).length);
  });

  it('should have a trailing-slash href for each item', () => {
    NAV_ITEMS.forEach((item) => {
      expect(item.href).toMatch(/^\/[\w-]+\/$/);
    });
  });

  it('should use the correct label for waste-recycling', () => {
    const item = NAV_ITEMS.find((i) => i.slug === 'waste-recycling');
    expect(item?.label).toBe('Waste & Recycling');
  });

  it('should have a React component as icon for each item', () => {
    NAV_ITEMS.forEach((item) => {
      expect(typeof item.icon).toBe('function');
    });
  });

  it('should have unique slugs', () => {
    const slugs = NAV_ITEMS.map((i) => i.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });
});
