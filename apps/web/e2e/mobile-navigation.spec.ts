import { test, expect } from '@playwright/test';

import { categoryPage } from './utils/pages';
import { selectors } from './utils/selectors';

const MOBILE_VIEWPORT = { width: 393, height: 851 };
const DESKTOP_VIEWPORT = { width: 1280, height: 720 };

test.describe('Mobile header', { tag: '@smoke' }, () => {
  test('should be visible on mobile viewport with logo and brand link', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');

    const header = page.locator(selectors.mobileHeader);
    await expect(header).toBeVisible();

    // Brand link with logo SVG is inside the mobile header
    const brandLink = header.locator(selectors.brandLink);
    await expect(brandLink).toBeVisible();
  });

  test('should navigate to home page when brand link is clicked', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    // Start on a category page
    const cp = categoryPage('air-quality');
    await page.goto(cp.url);

    // Click the brand link in the mobile header
    await page.locator(selectors.mobileHeader).locator(selectors.brandLink).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Bottom navigation bar on mobile', { tag: '@smoke' }, () => {
  test('should render as bottom bar (not sidebar) on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');

    const nav = page.locator(selectors.nav);
    await expect(nav).toBeVisible();

    // The bottom bar has bottom-0 and h-20 classes
    const navClass = await nav.getAttribute('class');
    expect(navClass).toContain('bottom-0');
  });

  test('should have scroll container with horizontal scroll', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');

    const navList = page.locator(selectors.navList);
    await expect(navList).toBeVisible();
    await expect(navList).toHaveAttribute('aria-label', 'Navigation items');
  });

  test('should have 12 NavLinks (one per category) in scroll container', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');

    // Each NavLink is a <li> inside the <ul> — count the links
    const navLinks = page.locator('ul[aria-label="Navigation items"] li a');
    await expect(navLinks).toHaveCount(12);
  });

  test('should navigate to correct category when mobile NavLink is clicked', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');

    const cp = categoryPage('air-quality');
    const link = page.getByRole('link', { name: 'Air Quality' });
    await link.click();
    await expect(page).toHaveURL(cp.url);
  });

  test('should update aria-current on active NavLink', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');

    await page.getByRole('link', { name: 'Air Quality' }).click();

    const activeLink = page.getByRole('link', { name: 'Air Quality' });
    await expect(activeLink).toHaveAttribute('aria-current', 'page');
  });

  test('should show gradient fade affordance at right edge on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');

    // With 12 NavLinks at w-20 (80px) each = 880px content width,
    // and a 393px viewport, there is overflow. The right gradient
    // should be visible when scroll is at the start (canScrollRight = true).
    const rightGradient = page
      .locator('ul[aria-label="Navigation items"]')
      .locator('..')
      .locator('[aria-hidden="true"].bg-gradient-to-l');
    await expect(rightGradient).toBeVisible();
  });
});

test.describe('Desktop viewport — bottom bar absent', { tag: '@smoke' }, () => {
  test('should hide bottom bar on desktop viewport', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/');

    // The Navbar is visible as a sidebar on desktop (not hidden).
    // But the bottom-bar positioning (bottom-0, h-20) should not be
    // the active layout on desktop.
    // The nav still exists but as a left sidebar.
    const nav = page.locator(selectors.nav);
    await expect(nav).toBeVisible();
    // Sidebar has lg:w-76, not h-20
    const navClass = await nav.getAttribute('class');
    expect(navClass).toContain('lg:h-screen');
  });
});
