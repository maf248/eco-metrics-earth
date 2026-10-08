import robots from '@/app/robots';

describe('robots', () => {
  it('should declare a single rule group', () => {
    const result = robots();
    expect(Array.isArray(result.rules)).toBe(false);
  });

  it('should allow all user-agents on every path', () => {
    const result = robots();
    expect(result.rules).toEqual({ userAgent: '*', allow: '/' });
  });

  it('should not disallow any path', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    for (const rule of rules) {
      expect(rule.disallow).toBeUndefined();
    }
  });

  it('should include a sitemap URL', () => {
    const result = robots();
    expect(result.sitemap).toBeDefined();
  });

  it('should point sitemap to /sitemap.xml', () => {
    const result = robots();
    const sitemap = result.sitemap as string;
    expect(sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it('should use an absolute URL for the sitemap', () => {
    const result = robots();
    const sitemap = result.sitemap as string;
    expect(sitemap).toMatch(/^https?:\/\//);
  });
});
