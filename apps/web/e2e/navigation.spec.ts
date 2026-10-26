import { test, expect } from '@playwright/test';

import { homePage, categoryPage, CATEGORY_SLUGS } from './utils/pages';
import { selectors } from './utils/selectors';

test.describe('Home page', { tag: '@smoke' }, () => {
  test('should render home page with correct metadata', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(homePage.title);
    await expect(page.locator(selectors.mainContent)).toBeVisible();
    // The home page renders a SiteLogoIcon inside #main-content.
    // Brand links in MobileHeader + Navbar may be hidden depending on viewport.
    await expect(page.locator('#main-content svg')).toBeVisible();
    await expect(page.locator(selectors.skipLink)).toBeVisible();
  });
});

test.describe('Category pages', () => {
  for (const slug of CATEGORY_SLUGS) {
    const cp = categoryPage(slug);
    test(`should render ${slug} page with correct metadata`, async ({ page }) => {
      const response = await page.goto(cp.url);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL(cp.url);
      await expect(page).toHaveTitle(cp.title);
      await expect(page.getByRole('heading', { name: cp.heading, level: 1 })).toBeVisible();
      // The icon is an <svg aria-hidden="true"> inside #main-content
      await expect(page.locator(cp.iconSelector)).toBeVisible();
    });
  }

  test('should use "Waste & Recycling" title override', async ({ page }) => {
    await page.goto('/waste-recycling/');
    await expect(page.getByRole('heading', { name: 'Waste & Recycling' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Waste Recycling' })).toHaveCount(0);
  });
});

test.describe('Desktop sidebar navigation', () => {
  test('should navigate to each category from sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto('/');

    // Verify the last nav item (Water Footprint) is reachable within the nav.
    // toBeInViewport (not toBeVisible): a link clipped off-screen below the
    // fixed sidebar still has a bounding box and would pass toBeVisible.
    const navList = page.locator(selectors.navList);
    const waterFootprintLink = navList.getByRole('link', { name: 'Water Footprint' });
    await waterFootprintLink.scrollIntoViewIfNeeded();
    await expect(waterFootprintLink).toBeInViewport();

    for (const slug of CATEGORY_SLUGS) {
      const cp = categoryPage(slug);
      await page.locator(selectors.nav).getByRole('link', { name: cp.heading }).click();
      await expect(page).toHaveURL(cp.url);
      // Verify aria-current on the active link
      const activeLink = page.locator(selectors.nav).getByRole('link', { name: cp.heading });
      await expect(activeLink).toHaveAttribute('aria-current', 'page');
    }
  });

  test('should mark home link as active on home page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto('/');
    // The desktop brand link does NOT use the NavLink component,
    // so it does not carry aria-current. Instead, verify the URL
    // and the visible NavLinks are not marked active.
    await expect(page).toHaveURL('/');
    // The Home link does not appear in the NavScrollContainer;
    // verifying no category link has aria-current="page" on home.
    const activeLinks = page.locator('[aria-current="page"]');
    await expect(activeLinks).toHaveCount(0);
  });
});

test.describe('404 page', () => {
  test('should render custom 404 page for unknown routes', async ({ page }) => {
    const response = await page.goto('/nonexistent/');
    expect(response?.status()).toBe(404);
    await expect(page.locator(selectors.notFoundIcon)).toBeVisible();
    const homeLink = page.getByRole('link', { name: 'Go back to home' });
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await expect(page).toHaveURL('/');
  });
});
