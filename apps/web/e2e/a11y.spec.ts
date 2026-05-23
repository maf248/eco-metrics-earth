import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

import { categoryPage, CATEGORY_SLUGS } from './utils/pages';
import { selectors } from './utils/selectors';

test.describe('Accessibility audit — home page', { tag: '@smoke' }, () => {
  test('should have zero critical and serious violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(violations).toEqual([]);
  });
});

test.describe('Accessibility audit — category pages', () => {
  for (const slug of CATEGORY_SLUGS) {
    const cp = categoryPage(slug);
    test(`should have zero critical and serious violations on ${slug} page`, async ({ page }) => {
      await page.goto(cp.url);
      const results = await new AxeBuilder({ page }).analyze();
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
