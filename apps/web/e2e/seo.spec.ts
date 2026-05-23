import { test, expect } from '@playwright/test';

import { homePage, categoryPage, CATEGORY_SLUGS } from './utils/pages';

test.describe('Trailing slash enforcement', { tag: '@smoke' }, () => {
  test('should add trailing slash when navigating without one', async ({ page }) => {
    await page.goto('/air-quality');
    await expect(page).toHaveURL('/air-quality/');
  });
});

test.describe('Home page metadata', { tag: '@smoke' }, () => {
  test('should have correct <title>', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(homePage.title);
  });

  test('should have correct meta description', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      homePage.description,
    );
  });

  test('should have Open Graph tags', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      homePage.title,
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      'content',
      homePage.description,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'http://localhost:3000/',
    );
  });

  test('should have Twitter card tags', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary');
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      'content',
      homePage.title,
    );
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
      'content',
      homePage.description,
    );
  });
});

test.describe('Category page metadata', () => {
  test('should have dynamic <title> template', async ({ page }) => {
    const cp = categoryPage('air-quality');
    await page.goto(cp.url);
    await expect(page).toHaveTitle(cp.title);
  });

  test('should have canonical link with trailing slash', async ({ page }) => {
    const cp = categoryPage('air-quality');
    await page.goto(cp.url);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /\/air-quality\/$/);
  });

  test('should have dynamic Open Graph tags on category page', async ({ page }) => {
    const cp = categoryPage('air-quality');
    await page.goto(cp.url);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', cp.heading);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      /\/air-quality\/$/,
    );
  });

  test('should have dynamic Twitter tags on category page', async ({ page }) => {
    const cp = categoryPage('air-quality');
    await page.goto(cp.url);
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', cp.heading);
  });
});

test.describe('Sitemap.xml', { tag: '@smoke' }, () => {
  test('should return 200 with valid XML', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/xml/);
    const text = await response.text();
    expect(text).toContain('<?xml');
    expect(text).toContain('<urlset');
  });

  test('should contain 12 <url> entries with trailing slashes', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    const text = await response.text();
    // Home page + 11 category pages = 12 entries
    const urlCount = (text.match(/<url>/g) || []).length;
    expect(urlCount).toBe(12);
    // All category URLs should end with a trailing slash
    for (const slug of CATEGORY_SLUGS) {
      expect(text).toContain(`/${slug}/`);
    }
    // Home page entry
    expect(text).toContain('<loc>http://localhost:3000/</loc>');
  });
});

test.describe('Robots.txt', { tag: '@smoke' }, () => {
  test('should return 200 with correct directives', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain('Allow: /');
    expect(text).toContain('Disallow: /api/');
    expect(text).toContain('Sitemap:');
  });
});

test.describe('PWA manifest', { tag: '@smoke' }, () => {
  test('should return 200 with valid JSON', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/json/);
    const json = await response.json();
    expect(json.name).toBe('eco-metrics earth');
    expect(json.display).toBe('standalone');
    expect(json.theme_color).toBe('#10b981');
    expect(Array.isArray(json.icons)).toBe(true);
    expect(json.icons.length).toBeGreaterThanOrEqual(1);
  });
});
