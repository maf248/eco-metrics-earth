import { ECO_CATEGORIES } from '@eco-metrics/shared';

import sitemap from '@/app/sitemap';

describe('sitemap', () => {
  it('should return 12 entries (1 home + 11 categories)', () => {
    const result = sitemap();
    expect(result).toHaveLength(1 + Object.keys(ECO_CATEGORIES).length);
  });

  it('should have home entry with priority 1.0', () => {
    const result = sitemap();
    const home = result[0];
    expect(home.priority).toBe(1.0);
  });

  it('should have home URL ending with trailing slash', () => {
    const result = sitemap();
    expect(result[0].url).toMatch(/\/$/);
  });

  it('should have all category entries with priority 0.8', () => {
    const result = sitemap();
    const categories = result.slice(1);
    categories.forEach((entry) => {
      expect(entry.priority).toBe(0.8);
    });
  });

  it('should have all URLs ending with trailing slash', () => {
    const result = sitemap();
    result.forEach((entry) => {
      expect(entry.url).toMatch(/\/$/);
    });
  });

  it('should have changeFrequency weekly for all entries', () => {
    const result = sitemap();
    result.forEach((entry) => {
      expect(entry.changeFrequency).toBe('weekly');
    });
  });

  it('should have lastModified as a Date instance for every entry', () => {
    const result = sitemap();
    result.forEach((entry) => {
      expect(entry.lastModified).toBeInstanceOf(Date);
    });
  });
});
