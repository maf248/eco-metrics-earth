import { test, expect } from '@playwright/test';

import {
  homePage,
  categoryPage,
  CATEGORY_SLUGS,
  CATEGORY_DESCRIPTION_SAMPLES,
} from './utils/pages';

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
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    );
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

  test('should have a unique meta description per category', async ({ page }) => {
    const descriptions: string[] = [];
    for (const slug of [
      'air-quality',
      'co2-emissions',
      'global-temperature',
      'energy-sources',
    ] as const) {
      await page.goto(categoryPage(slug).url);
      const meta = page.locator('meta[name="description"]');
      await expect(meta).toHaveAttribute('content', CATEGORY_DESCRIPTION_SAMPLES[slug]);
      descriptions.push((await meta.getAttribute('content')) ?? '');
    }
    expect(new Set(descriptions).size).toBe(descriptions.length);
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

const SOCIAL_CARD_PAGES = [
  { name: 'home page', url: homePage.url },
  { name: 'category page', url: categoryPage('air-quality').url },
];

test.describe('Social card metadata', { tag: '@smoke' }, () => {
  for (const { name, url } of SOCIAL_CARD_PAGES) {
    test(`should declare the shared Open Graph fields and social card on the ${name}`, async ({
      page,
    }) => {
      await page.goto(url);
      await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
      await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
        'content',
        'eco-metrics earth',
      );
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        'content',
        'http://localhost:3000/og-image.png',
      );
      await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
        'content',
        '1200',
      );
      await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
        'content',
        '630',
      );
      await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /\S/);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        'content',
        'summary_large_image',
      );
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
        'content',
        'http://localhost:3000/og-image.png',
      );
    });
  }

  test('should serve the social card as a PNG without a redirect', async ({ request }) => {
    const response = await request.get('/og-image.png', { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
  });

  test('should declare the PNG apple touch icon', async ({ page, request }) => {
    await page.goto(homePage.url);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/icons/apple-touch-icon.png',
    );
    const response = await request.get('/icons/apple-touch-icon.png');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
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

  test('should contain 14 <url> entries with trailing slashes', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    const text = await response.text();
    // Home page + 12 category pages + data sources = 14 entries
    const urlCount = (text.match(/<url>/g) || []).length;
    expect(urlCount).toBe(14);
    // All category URLs should end with a trailing slash
    for (const slug of CATEGORY_SLUGS) {
      expect(text).toContain(`/${slug}/`);
    }
    // Home page entry
    expect(text).toContain('<loc>http://localhost:3000/</loc>');
    expect(text).toContain('<loc>http://localhost:3000/data-sources/</loc>');
  });
});

test.describe('Robots.txt', { tag: '@smoke' }, () => {
  test('should return 200 with correct directives', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text.match(/^User-Agent: \*$/gim)).toHaveLength(1);
    expect(text).toContain('Allow: /');
    expect(text).not.toContain('Disallow');
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

  test('should declare separate "any" and "maskable" icons', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    const json = await response.json();
    const purposes = json.icons.map((icon: { purpose: string }) => icon.purpose);
    expect(purposes).toContain('any');
    expect(purposes).toContain('maskable');
    expect(purposes.every((purpose: string) => ['any', 'maskable'].includes(purpose))).toBe(true);
  });
});
