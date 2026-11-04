import { expect, test } from '@playwright/test';

import { dataSourcesPage } from './utils/pages';

const POORE_NEMECEK = 'Poore & Nemecek (2018), Science';

test.describe('Data sources page', () => {
  test.describe('Core render', () => {
    test(
      'should list the real water-footprint sources with publisher and license',
      { tag: '@smoke' },
      async ({ page }) => {
        const response = await page.goto(dataSourcesPage.url);
        expect(response?.status()).toBe(200);

        await expect(page.getByRole('heading', { name: 'Data sources', level: 1 })).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'Water footprint of products' }),
        ).toBeVisible();
        await expect(page.getByRole('link', { name: POORE_NEMECEK })).toHaveCount(1);
        await expect(page.locator('body')).toContainText('Published 2018');
        await expect(page.locator('body')).toContainText(
          'Republished by Our World in Data (CC BY 4.0)',
        );
        await expect(page.locator('body')).toContainText('CC BY 4.0');
      },
    );

    test('should list Our World in Data as a live provider for the CO2 emissions page', async ({
      page,
    }) => {
      await page.goto(dataSourcesPage.url);

      await expect(page.getByRole('heading', { name: 'Live data providers' })).toBeVisible();
      const providers = page.getByRole('region', { name: 'Live data providers' });
      await expect(providers.getByRole('link', { name: 'Our World in Data' })).toBeVisible();
      await expect(providers).toContainText('CO2 Emissions');
      await expect(page.getByRole('heading', { name: 'Cited publications' })).toBeVisible();
    });

    test('should list the upstream origins under Our World in Data with their licenses', async ({
      page,
    }) => {
      await page.goto(dataSourcesPage.url);

      const providers = page.getByRole('region', { name: 'Live data providers' });
      await expect(providers.getByRole('heading', { name: 'Data produced by' })).toBeVisible();
      for (const [producer, title, license] of [
        ['Global Carbon Project', 'Global Carbon Budget', 'CC BY 4.0'],
        ['Copernicus Climate Change Service (C3S)', 'ERA5 monthly averaged data', 'CC BY 4.0'],
        ['Met Office Hadley Centre', 'HadCRUT5', 'Open Government Licence v3.0'],
      ] as const) {
        const origin = providers.getByRole('listitem').filter({ hasText: producer }).last();
        await expect(origin.getByRole('link', { name: new RegExp(title) })).toBeVisible();
        await expect(origin.getByRole('link', { name: license })).toBeVisible();
      }
      await expect(providers).toContainText('Contains modified Copernicus Climate Change Service');
      await expect(providers).toContainText('Morice et al. (2021)');
    });

    test('should include the same content in the server-rendered HTML', async ({ request }) => {
      const html = await (await request.get(dataSourcesPage.url)).text();

      expect(html).toContain('Water footprint of products');
      expect(html).toContain('Poore &amp; Nemecek (2018), Science');
      expect(html).toContain('Our World in Data');
      expect(html).toContain('CC BY 4.0');
    });

    test('should have the correct title, description and canonical URL', async ({ page }) => {
      await page.goto(dataSourcesPage.url);

      await expect(page).toHaveTitle(dataSourcesPage.fullTitle);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        /\/data-sources\/$/,
      );
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        'content',
        dataSourcesPage.title,
      );
    });
  });

  test.describe('Navigation', () => {
    test('should be reachable from the footer', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('contentinfo').getByRole('link', { name: 'Data sources' }).click();

      await expect(page).toHaveURL(/\/data-sources\/$/);
      await expect(page.getByRole('heading', { name: 'Data sources', level: 1 })).toBeVisible();
    });

    test('should be reachable from the water-footprint note', async ({ page }) => {
      await page.goto('/water-footprint/');
      await page.getByRole('link', { name: 'All data sources' }).click();

      await expect(page).toHaveURL(/\/data-sources\/$/);
    });
  });
});
