import { test, expect } from '@playwright/test';

import {
  homePage,
  categoryPage,
  CATEGORY_SLUGS,
  LIVE_CATEGORY_SLUGS,
  CATEGORY_DESCRIPTION_SAMPLES,
} from './utils/pages';

test.describe('Trailing slash enforcement', () => {
  test('should add trailing slash when navigating without one', async ({ page }) => {
    await page.goto('/air-quality');
    await expect(page).toHaveURL('/air-quality/');
  });
});

test.describe('Home page metadata', () => {
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

test.describe('Social card metadata', () => {
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

test.describe('Sitemap.xml', () => {
  test('should return 200 with valid XML', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/xml/);
    const text = await response.text();
    expect(text).toContain('<?xml');
    expect(text).toContain('<urlset');
  });

  test('should list the home, the live categories and data sources', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    const text = await response.text();
    // Home page + 4 live category pages + data sources = 6 entries
    const urlCount = (text.match(/<url>/g) || []).length;
    expect(urlCount).toBe(2 + LIVE_CATEGORY_SLUGS.length);
    // Placeholder categories are noindex, so only live ones are listed, with a trailing slash
    for (const slug of CATEGORY_SLUGS) {
      const listed = text.includes(`/${slug}/</loc>`);
      expect(listed).toBe(LIVE_CATEGORY_SLUGS.includes(slug));
    }
    // Home page entry
    expect(text).toContain('<loc>http://localhost:3000/</loc>');
    expect(text).toContain('<loc>http://localhost:3000/data-sources/</loc>');
  });
});

test.describe('Robots meta', () => {
  test('should mark a placeholder category as noindex, follow', async ({ request }) => {
    const html = await (await request.get('/ocean-health/')).text();
    expect(html).toContain('name="robots" content="noindex, follow"');
    expect(html).toContain('rel="canonical"');
  });

  for (const path of ['/', '/co2-emissions/', '/data-sources/']) {
    test(`should leave ${path} indexable`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      expect(html).not.toContain('name="robots"');
    });
  }
});

test.describe('Home page structured data', () => {
  test('should declare the WebSite and its Organization', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const json = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)?.[1] ?? '{}';
    const graph = JSON.parse(json)['@graph'] as Record<string, unknown>[];
    const website = graph.find((node) => node['@type'] === 'WebSite');
    const organization = graph.find((node) => node['@type'] === 'Organization');

    expect(website).toMatchObject({ name: 'eco-metrics earth', url: 'http://localhost:3000/' });
    expect(organization?.logo).toMatch(/^http:\/\/localhost:3000\/.+\.png$/);
    expect(website?.publisher).toEqual({ '@id': organization?.['@id'] });
  });
});

test.describe('Robots.txt', () => {
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

test.describe('PWA manifest', () => {
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

test.describe('Complete HTML on direct visits', () => {
  for (const { path, heading, content } of [
    { path: '/', heading: 'Environmental data, made readable', content: 'href="/data-sources/"' },
    { path: '/co2-emissions/', heading: 'CO2 Emissions', content: 'application/ld+json' },
    { path: '/energy-sources/', heading: 'Energy Sources', content: 'application/ld+json' },
    { path: '/ocean-health/', heading: 'Ocean Health', content: 'coming soon' },
  ]) {
    test(`should deliver ${path} complete and visible without JavaScript`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      const footer = html.indexOf('<footer');

      expect(html.indexOf(heading)).toBeGreaterThan(-1);
      expect(html.indexOf('<h1')).toBeLessThan(footer);
      expect(html.indexOf(content)).toBeLessThan(footer);
      expect(html).not.toMatch(/<div hidden id="S:/);
      expect(html).not.toContain('aria-busy="true"');
      expect(html.match(/<main[\s>]/g)).toHaveLength(1);
    });
  }

  test('should deliver the 404 of an unknown slug complete without JavaScript', async ({
    request,
  }) => {
    const response = await request.get('/unknown-category/');
    const html = await response.text();

    expect(response.status()).toBe(404);
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).toContain('find that...');
    expect(html.indexOf('find that...')).toBeLessThan(html.indexOf('<footer'));
    expect(html).not.toContain('__next_error__');
  });
});
