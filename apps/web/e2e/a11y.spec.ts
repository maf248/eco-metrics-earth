import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

import { categoryPage, CATEGORY_SLUGS, dataSourcesPage } from './utils/pages';
import { selectors } from './utils/selectors';

// Axe samples computed colors, so a `transition-colors` still running after load
// (e.g. on the nav links) yields intermediate, low-contrast values. Freeze
// transitions and animations so the audit sees the final colors.
// BrandText also types the brand out over ~1 s, and axe's
// label-content-name-mismatch compares the link's visible text with its
// accessible name word by word, so a scan mid-typing sees a partial word.
// Wait for the full brand text before scanning.
async function analyzeSettled(page: Page): ReturnType<AxeBuilder['analyze']> {
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
  });
  await expect(page.locator(selectors.brandLink).filter({ visible: true })).toContainText(
    '~ eco-metrics.earth',
  );
  return new AxeBuilder({ page }).analyze();
}

test.describe('Accessibility audit — home page', { tag: '@smoke' }, () => {
  test('should have zero critical and serious violations', async ({ page }) => {
    await page.goto('/');
    const results = await analyzeSettled(page);
    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(violations).toEqual([]);
  });
});

test.describe('Accessibility audit — category pages', () => {
  // Cold dev-server runs compile routes on first hit, and axe analysis on the
  // heaviest page (water-footprint's 60-row table) can exceed the 30s default.
  test.setTimeout(60_000);

  for (const slug of CATEGORY_SLUGS) {
    const cp = categoryPage(slug);
    test(`should have zero critical and serious violations on ${slug} page`, async ({ page }) => {
      await page.goto(cp.url);
      const results = await analyzeSettled(page);
      const violations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(violations).toEqual([]);
    });
  }
});

test.describe('Accessibility audit — CO2 emissions page', () => {
  test.setTimeout(60_000);

  const criticalAndSerious = (results: Awaited<ReturnType<typeof analyzeSettled>>) =>
    results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');

  test('should have zero critical and serious violations in the light theme', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('eco-metrics-theme', 'light'));
    await page.goto('/co2-emissions/');
    await expect(page.getByTestId('echart').locator('svg').first()).toBeVisible();

    expect(criticalAndSerious(await analyzeSettled(page))).toEqual([]);
  });

  test('should have zero critical and serious violations in the dark theme', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('eco-metrics-theme', 'dark'));
    await page.goto('/co2-emissions/');
    await expect(page.getByTestId('echart').locator('svg').first()).toBeVisible();

    expect(criticalAndSerious(await analyzeSettled(page))).toEqual([]);
  });

  test('should have zero critical and serious violations with the country list open', async ({
    page,
  }) => {
    await page.goto('/co2-emissions/');
    await page.getByRole('combobox', { name: 'Country' }).press('ArrowDown');
    await expect(page.getByRole('option').first()).toBeVisible();

    expect(criticalAndSerious(await analyzeSettled(page))).toEqual([]);
  });

  test('should have zero critical and serious violations with the data table open', async ({
    page,
  }) => {
    await page.goto('/co2-emissions/');
    const explorer = page.getByRole('region', { name: 'Explore emissions by country' });
    await explorer.getByText('View data table').click();
    await expect(explorer.getByRole('table')).toBeVisible();

    expect(criticalAndSerious(await analyzeSettled(page))).toEqual([]);
  });

  test('should have zero critical and serious violations with the ranking table open and sorted', async ({
    page,
  }) => {
    await page.goto('/co2-emissions/');
    const card = page.getByRole('region', { name: /^CO2 emissions per capita, \d{4}/ });
    await card.getByText('View data table').click();
    await card.getByRole('button', { name: /^Total/ }).click();
    await card.getByRole('button', { name: 'Argentina' }).click();
    await expect(card.locator('tr[aria-current="true"]')).toBeVisible();

    expect(criticalAndSerious(await analyzeSettled(page))).toEqual([]);
  });
});

test.describe('Accessibility audit — global temperature page', () => {
  test.setTimeout(60_000);

  const criticalAndSerious = (results: Awaited<ReturnType<typeof analyzeSettled>>) =>
    results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');

  test('should have zero critical and serious violations in the light theme', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('eco-metrics-theme', 'light'));
    await page.goto('/global-temperature/');
    await expect(page.getByTestId('echart').locator('svg').first()).toBeVisible();

    expect(criticalAndSerious(await analyzeSettled(page))).toEqual([]);
  });

  test('should have zero critical and serious violations in the dark theme', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('eco-metrics-theme', 'dark'));
    await page.goto('/global-temperature/');
    await expect(page.getByTestId('echart').locator('svg').first()).toBeVisible();

    expect(criticalAndSerious(await analyzeSettled(page))).toEqual([]);
  });

  test('should have zero critical and serious violations with the country list open', async ({
    page,
  }) => {
    await page.goto('/global-temperature/');
    await page.getByRole('combobox', { name: 'Country' }).press('ArrowDown');
    await expect(page.getByRole('option').first()).toBeVisible();

    expect(criticalAndSerious(await analyzeSettled(page))).toEqual([]);
  });

  test('should have zero critical and serious violations with the data table open', async ({
    page,
  }) => {
    await page.goto('/global-temperature/');
    const explorer = page.getByRole('region', { name: 'Explore temperature by country' });
    await explorer.getByText('View data table').click();
    await expect(explorer.getByRole('table')).toBeVisible();

    expect(criticalAndSerious(await analyzeSettled(page))).toEqual([]);
  });

  for (const theme of ['light', 'dark']) {
    test(`should have zero critical and serious violations with the long-run section in view (${theme})`, async ({
      page,
    }) => {
      await page.addInitScript((value) => localStorage.setItem('eco-metrics-theme', value), theme);
      await page.goto('/global-temperature/');
      const section = page.locator('section', {
        has: page.getByRole('heading', { level: 2, name: /Global temperature since 1850/ }),
      });
      await section.scrollIntoViewIfNeeded();
      await expect(section.getByTestId('echart').locator('svg').first()).toBeVisible();
      await section.getByText('View data table').click();

      expect(criticalAndSerious(await analyzeSettled(page))).toEqual([]);
    });
  }
});

test.describe('Accessibility audit — energy sources page', () => {
  test.setTimeout(60_000);

  const criticalAndSerious = (results: Awaited<ReturnType<typeof analyzeSettled>>) =>
    results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');

  test('should have zero critical and serious violations in the light theme', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('eco-metrics-theme', 'light'));
    await page.goto('/energy-sources/');
    await expect(page.getByTestId('echart').locator('svg').first()).toBeVisible();

    expect(criticalAndSerious(await analyzeSettled(page))).toEqual([]);
  });

  test('should have zero critical and serious violations in the dark theme', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('eco-metrics-theme', 'dark'));
    await page.goto('/energy-sources/');
    await expect(page.getByTestId('echart').locator('svg').first()).toBeVisible();

    expect(criticalAndSerious(await analyzeSettled(page))).toEqual([]);
  });

  test('should have zero critical and serious violations with the country list open', async ({
    page,
  }) => {
    await page.goto('/energy-sources/');
    await page.getByRole('combobox', { name: 'Country' }).press('ArrowDown');
    await expect(page.getByRole('option').first()).toBeVisible();

    expect(criticalAndSerious(await analyzeSettled(page))).toEqual([]);
  });

  test('should have zero critical and serious violations with the year table open', async ({
    page,
  }) => {
    await page.goto('/energy-sources/');
    await page.getByText('View data table').click();
    await expect(page.getByRole('table').first()).toBeVisible();

    expect(criticalAndSerious(await analyzeSettled(page))).toEqual([]);
  });
});

test.describe('Accessibility audit — data sources page', () => {
  test('should have zero critical and serious violations', async ({ page }) => {
    await page.goto(dataSourcesPage.url);
    const results = await analyzeSettled(page);
    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(violations).toEqual([]);
  });
});

test.describe('Skip-to-content link', { tag: '@smoke' }, () => {
  test('should exist on home page and target #main-content', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator(selectors.skipLink);
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  test('should exist on category pages', async ({ page }) => {
    const cp = categoryPage('air-quality');
    await page.goto(cp.url);
    const skipLink = page.locator(selectors.skipLink);
    await expect(skipLink).toBeVisible();
  });
});

test.describe('Semantic landmarks', { tag: '@smoke' }, () => {
  test('should have nav with Main navigation label', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator(selectors.nav);
    await expect(nav).toBeVisible();
    await expect(nav).toHaveAttribute('aria-label', 'Main navigation');
  });

  test('should have main with id main-content', async ({ page }) => {
    await page.goto('/');
    const main = page.locator(selectors.mainContent);
    await expect(main).toBeVisible();
  });

  const footerPages = ['/', categoryPage('air-quality').url, dataSourcesPage.url, '/no-such-page/'];

  for (const url of footerPages) {
    test(`should have a single footer landmark outside main, in document flow on ${url}`, async ({
      page,
    }) => {
      await page.goto(url);
      const footer = page.getByRole('contentinfo');
      await expect(footer).toHaveCount(1);
      await expect(page.locator(`${selectors.mainContent} footer`)).toHaveCount(0);
      expect(await footer.evaluate((el) => getComputedStyle(el).position)).toBe('static');
    });
  }
});

test.describe('Footer layout', () => {
  test('should not be overlapped by the bottom nav at the end of the mobile scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    await footer.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const footerBox = await footer.boundingBox();
    const navBox = await page.locator(selectors.nav).boundingBox();
    expect((footerBox?.y ?? 0) + (footerBox?.height ?? 0)).toBeLessThanOrEqual(navBox?.y ?? 0);
  });

  test('should sit to the right of the sidebar on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const footerBox = await page.getByRole('contentinfo').boundingBox();
    expect(footerBox?.x).toBeGreaterThanOrEqual(304);
  });
});
