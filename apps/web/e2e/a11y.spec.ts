import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

import { categoryPage, CATEGORY_SLUGS } from './utils/pages';
import { selectors } from './utils/selectors';

// Axe samples computed colors, so a `transition-colors` still running after load
// (e.g. on the nav links) yields intermediate, low-contrast values. Freeze
// transitions and animations so the audit sees the final colors.
async function analyzeSettled(page: Page): ReturnType<AxeBuilder['analyze']> {
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
  });
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
});
