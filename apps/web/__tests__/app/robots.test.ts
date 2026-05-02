import robots from '../../src/app/robots';

describe('robots', () => {
  it('should allow all user-agents', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.userAgent).toBe('*');
    expect(rules.allow).toBe('/');
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
