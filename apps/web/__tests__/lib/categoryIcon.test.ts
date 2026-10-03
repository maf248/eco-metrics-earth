import { ECO_CATEGORIES } from '@eco-metrics/shared';

import { SiteLogoIcon } from '@/components/icons';
import { CATEGORY_ICONS, getCategoryIcon } from '@/lib/categoryIcon';

describe('getCategoryIcon', () => {
  it('should return a React component for every ECO_CATEGORY slug', () => {
    for (const slug of Object.values(ECO_CATEGORIES)) {
      const icon = getCategoryIcon(slug);
      expect(typeof icon).toBe('function');
    }
  });

  it('should return SiteLogoIcon as fallback for an unknown slug', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getCategoryIcon('unknown-slug')).toBe(SiteLogoIcon);
    expect(warnSpy).toHaveBeenCalledWith(
      '[categoryIcon] No icon registered for slug: "unknown-slug". Falling back to default.',
    );
    warnSpy.mockRestore();
  });

  it('should return SiteLogoIcon as fallback for an empty string', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getCategoryIcon('')).toBe(SiteLogoIcon);
    expect(warnSpy).toHaveBeenCalledWith(
      '[categoryIcon] No icon registered for slug: "". Falling back to default.',
    );
    warnSpy.mockRestore();
  });

  it('should have a unique icon component for each ECO_CATEGORY', () => {
    const icons = Object.values(CATEGORY_ICONS);
    const uniqueIcons = new Set(icons);
    expect(uniqueIcons.size).toBe(icons.length);
  });
});
