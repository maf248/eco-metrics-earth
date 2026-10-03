import { siteUrl } from '@/lib/siteUrl';

describe('siteUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return the env var value when set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://eco-metrics.earth';
    expect(siteUrl()).toBe('https://eco-metrics.earth');
  });

  it('should strip a trailing slash from the env var value', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://eco-metrics.earth/';
    expect(siteUrl()).toBe('https://eco-metrics.earth');
  });

  it('should trim surrounding whitespace from the env var value', () => {
    process.env.NEXT_PUBLIC_SITE_URL = '  https://eco-metrics.earth  ';
    expect(siteUrl()).toBe('https://eco-metrics.earth');
  });

  it('should fall back to http://localhost:3000 when env var is absent', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(siteUrl()).toBe('http://localhost:3000');
  });

  it('should fall back to http://localhost:3000 when env var is empty string', () => {
    process.env.NEXT_PUBLIC_SITE_URL = '';
    expect(siteUrl()).toBe('http://localhost:3000');
  });
});
