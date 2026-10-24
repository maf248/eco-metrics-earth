import sitemap from '@/app/sitemap';
import { ECO_CATEGORIES } from '@eco-metrics/shared';

describe('sitemap', () => {
  it('should return one entry for home, each category and data sources', () => {
    const result = sitemap();
    expect(result).toHaveLength(2 + Object.keys(ECO_CATEGORIES).length);
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
    const categories = result.slice(1, -1);
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

  it('should have changeFrequency weekly for the home and category entries', () => {
    const result = sitemap();
    result.slice(0, -1).forEach((entry) => {
      expect(entry.changeFrequency).toBe('weekly');
    });
  });

  it('should include the data sources page once, monthly with priority 0.5', () => {
    const entries = sitemap().filter(({ url }) => url.endsWith('/data-sources/'));

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ changeFrequency: 'monthly', priority: 0.5 });
  });

  it('should have lastModified as a Date instance for every entry', () => {
    const result = sitemap();
    result.forEach((entry) => {
      expect(entry.lastModified).toBeInstanceOf(Date);
    });
  });
});
