import { ECO_CATEGORIES } from '@eco-metrics/shared';

import { CATEGORY_ICONS, getCategoryIcon, SITE_LOGO_ICON } from '../../src/lib/categoryIcon';

describe('getCategoryIcon', () => {
  it('should return a React component for every ECO_CATEGORY slug', () => {
    for (const slug of Object.values(ECO_CATEGORIES)) {
      const icon = getCategoryIcon(slug);
      expect(typeof icon).toBe('function');
    }
  });

  it('should return SITE_LOGO_ICON as fallback for an unknown slug', () => {
    expect(getCategoryIcon('unknown-slug')).toBe(SITE_LOGO_ICON);
  });

  it('should return SITE_LOGO_ICON as fallback for an empty string', () => {
    expect(getCategoryIcon('')).toBe(SITE_LOGO_ICON);
  });

  it('should have a unique icon component for each ECO_CATEGORY', () => {
    const icons = Object.values(CATEGORY_ICONS);
    const uniqueIcons = new Set(icons);
    expect(uniqueIcons.size).toBe(icons.length);
  });
});
