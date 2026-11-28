import { expect, test } from '@playwright/test';

import { privacyPage } from './utils/pages';

test.describe('Privacy page', () => {
  test('should be reached from the footer link', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click();

    await expect(page).toHaveURL(/\/privacy\/$/);
    await expect(page.getByRole('heading', { name: privacyPage.title, level: 1 })).toBeVisible();
  });

  test('should state that the site sets no cookies', async ({ page }) => {
    await page.goto(privacyPage.url);

    await expect(page.locator('body')).toContainText('sets no cookies');
  });

  for (const path of ['/', privacyPage.url]) {
    test(`should show no consent banner or dialog on ${path}`, async ({ page }) => {
      await page.goto(path);

      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText(/consent/i);
    });
  }

  test('should make no analytics request outside Vercel production', async ({ page }) => {
    const vercelRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/_vercel/')) {
        vercelRequests.push(request.url());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(vercelRequests).toEqual([]);
  });
});
