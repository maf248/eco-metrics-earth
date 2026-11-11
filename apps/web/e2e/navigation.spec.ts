import { test, expect } from '@playwright/test';

import { homePage, categoryPage, CATEGORY_SLUGS, LIVE_CATEGORY_SLUGS } from './utils/pages';
import { selectors } from './utils/selectors';

test.describe('Home page', { tag: '@smoke' }, () => {
  test('should render home page with correct metadata', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(homePage.title);
    await expect(page.locator(selectors.mainContent)).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Environmental data, made readable' }),
    ).toBeVisible();
    await expect(page.locator(selectors.skipLink)).toBeVisible();
  });

  test('should scroll to the topics from the hero call to action', async ({ page }) => {
    await page.goto('/');
    await page
      .locator(selectors.mainContent)
      .getByRole('link', { name: /^Explore the data/ })
      .click();

    await expect(page).toHaveURL('/#topics');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Explore the data' }),
    ).toBeInViewport();
  });

  test('should open a category from its card', async ({ page }) => {
    await page.goto('/');
    // The link is stretched over the card: a click anywhere on the card follows it.
    await page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: 'CO2 Emissions by Country' }) })
      .click({ position: { x: 24, y: 24 } });

    await expect(page).toHaveURL('/co2-emissions/');
    await expect(page.getByRole('heading', { level: 1, name: 'CO2 Emissions' })).toBeVisible();
  });
});

test.describe('Home page content', () => {
  test('should list one card per live category, in navigation order', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByRole('region', { name: 'Explore the data' }).getByRole('link');

    await expect(cards).toHaveText(
      LIVE_CATEGORY_SLUGS.map((slug) => new RegExp(`^Explore ${categoryPage(slug).heading}`)),
    );
  });

  test('should type the headline and animate only the call-to-action scroll', async ({ page }) => {
    await page.goto('/');
    const scrollBehavior = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    const typing = page.locator('.typewriter-char').last();

    await expect(typing).toHaveCSS('animation-name', 'typewriter-hidden');
    expect(await scrollBehavior()).toBe('auto');

    await page
      .locator(selectors.mainContent)
      .getByRole('link', { name: /^Explore the data/ })
      .click();
    expect(await scrollBehavior()).toBe('smooth');
    // The class is dropped once the scroll is over, so no other scroll is animated.
    await expect.poll(scrollBehavior).toBe('auto');
  });

  test('should show the headline at once and jump with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const lastCharacter = page.locator('.typewriter-char').last();

    await expect(lastCharacter).toHaveCSS('animation-name', 'none');
    await expect(lastCharacter).toHaveCSS('opacity', '1');
    await expect(page.locator('.typewriter-cursor .animate-cursor-blink')).toHaveCSS(
      'animation-name',
      'none',
    );

    await page
      .locator(selectors.mainContent)
      .getByRole('link', { name: /^Explore the data/ })
      .click();
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
    ).toBe('auto');
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
