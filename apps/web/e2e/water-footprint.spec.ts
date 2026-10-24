import { expect, test } from '@playwright/test';

import { waterFootprintPage } from './utils/pages';

test.describe('Water Footprint page', () => {
  test.describe('Core render', { tag: '@smoke' }, () => {
    test('should render the page with heading, product data, and filters', async ({ page }) => {
      const response = await page.goto('/water-footprint/');
      expect(response?.status()).toBe(200);

      await expect(page.getByRole('heading', { name: 'Water Footprint', level: 1 })).toBeVisible();
      await expect(page.locator('body')).toContainText('Beef (beef herd)');
      await expect(page.getByRole('radio', { name: 'Textiles' })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'All' })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Digital & Computing' })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Vehicles' })).toBeVisible();
      await expect(page.locator('body')).toContainText(
        'Values of different water types are not directly comparable',
      );
    });

    test('should include product names in server-rendered HTML', async ({ request }) => {
      const response = await request.get('/water-footprint/');
      const html = await response.text();

      expect(html).toContain('Beef (beef herd)');
      expect(html).toContain('Cotton (lint)');
    });

    test('should have the correct title and canonical URL', async ({ page }) => {
      await page.goto('/water-footprint/');

      await expect(page).toHaveTitle(waterFootprintPage.fullTitle);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        waterFootprintPage.description,
      );
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        'content',
        waterFootprintPage.title,
      );
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
        'content',
        waterFootprintPage.description,
      );
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute('href', /\/water-footprint\/$/);
    });
  });

  test.describe('Interaction', () => {
    test('should filter, sort, and surface attribution on the desktop table', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/water-footprint/');

      const table = page.getByTestId('water-footprint-table');
      await expect(table).toBeVisible();

      const bodyRows = table.locator('tbody tr');
      await expect(bodyRows).toHaveCount(60);

      await expect(page.getByRole('columnheader', { name: 'Water type' })).toBeVisible();

      const waterFootprintHeader = page.getByRole('columnheader', { name: 'Water footprint' });
      await expect(waterFootprintHeader).toHaveAttribute('aria-sort', 'descending');

      await page.getByRole('button', { name: 'Water footprint' }).click();
      await expect(waterFootprintHeader).toHaveAttribute('aria-sort', 'ascending');
      await expect(table.locator('tbody tr:first-child th')).toHaveText(
        'AI text prompt (Gemini, median)',
      );
      await expect(table.locator('tbody tr:first-child')).toContainText('0.00026 L');
      await expect(table.locator('tbody tr:first-child')).toContainText('Life cycle (on-site)');

      const sourceLink = page.getByRole('link', { name: 'Poore & Nemecek' }).first();
      await expect(sourceLink).toBeVisible();

      await table.locator('summary').first().click();
      await expect(page.locator('body')).toContainText('Median Gemini Apps text prompt');

      await page.locator('fieldset').getByText('Textiles').click();
      await expect(bodyRows).toHaveCount(5);
      await expect(page.getByRole('status')).toContainText('Showing 5 of 60');
    });

    test('should filter to the Digital & Computing category', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/water-footprint/');

      const table = page.getByTestId('water-footprint-table');
      await page.locator('fieldset').getByText('Digital & Computing').click();

      await expect(table.locator('tbody tr')).toHaveCount(5);
      await expect(page.getByRole('status')).toContainText('Showing 5 of 60');
      await expect(table).toContainText('Bitcoin transaction');
      await expect(table).toContainText('GPT-3 training run (total)');
    });

    test('should show exactly one active filter label after selecting a category', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/water-footprint/');

      const labels = page.locator('fieldset label');

      const activeLabelText = () =>
        labels.evaluateAll((elements) => {
          const styles = elements.map((element) => ({
            text: element.textContent,
            backgroundColor: window.getComputedStyle(element).backgroundColor,
          }));

          const counts = styles.reduce<Record<string, number>>((acc, { backgroundColor }) => {
            acc[backgroundColor] = (acc[backgroundColor] ?? 0) + 1;
            return acc;
          }, {});

          const activeBackground = Object.keys(counts).find((key) => counts[key] === 1);
          return (
            styles.find(({ backgroundColor }) => backgroundColor === activeBackground)?.text ?? null
          );
        });

      await expect.poll(activeLabelText).toBe('All');

      await page.locator('fieldset').getByText('Food & Beverages').click();

      await expect.poll(activeLabelText).toBe('Food & Beverages');
    });
  });

  test.describe('Source attribution', () => {
    test('should name the OWID publisher per row and in the note below the table', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/water-footprint/');

      const table = page.getByTestId('water-footprint-table');
      const owidRow = table.locator('tbody tr', { hasText: 'Poore & Nemecek' }).first();
      await expect(owidRow).toContainText('via Our World in Data (CC BY 4.0)');

      const dataSourcesLink = page.getByRole('link', { name: 'All data sources' });
      const note = dataSourcesLink.locator('xpath=..');
      await expect(note).toContainText(
        'Some values are republished by Our World in Data (CC BY 4.0)',
      );
      await expect(dataSourcesLink).toHaveAttribute('href', '/data-sources/');
      const [tableBox, noteBox] = [await table.boundingBox(), await note.boundingBox()];
      expect(noteBox?.y).toBeGreaterThan((tableBox?.y ?? 0) + (tableBox?.height ?? 0));
    });
  });

  test.describe('Responsive layout', () => {
    test('should show the table on desktop and hide the card list', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/water-footprint/');

      await expect(page.getByTestId('water-footprint-table')).toBeVisible();
      await expect(page.getByTestId('water-footprint-cards')).toBeHidden();
    });

    test('should show the card list on mobile and hide the table', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/water-footprint/');

      await expect(page.getByTestId('water-footprint-cards')).toBeVisible();
      await expect(page.getByTestId('water-footprint-table')).toBeHidden();
    });
  });
});
