import { expect, test, type Locator, type Page } from '@playwright/test';

import { CATEGORY_DESCRIPTION_SAMPLES, categoryPage } from './utils/pages';

const PAGE_URL = '/waste-recycling/';
const categoryInfo = categoryPage('waste-recycling');

const map = (page: Page) => page.getByRole('region', { name: 'Share of municipal waste recycled' });
const comparison = (page: Page) => page.getByRole('region', { name: 'Compare countries' });
const measureToggle = (page: Page) =>
  map(page).getByRole('group', { name: 'Measure shown on the map' });
const treatmentTable = (page: Page) =>
  comparison(page).getByRole('table', {
    name: 'What happens to the waste of the selected countries',
  });
const projection = (page: Page) => page.getByRole('region', { name: 'Projected waste generation' });

/** Waits for the first chart of a card to draw (the chunk loads lazily). */
async function showChart(card: ReturnType<typeof comparison>): Promise<void> {
  // Below the fold the chart mounts only once it scrolls near the viewport.
  await card.scrollIntoViewIfNeeded();
  await expect(card.getByTestId('echart').locator('svg').first()).toBeVisible({ timeout: 20_000 });
}

/**
 * Opens the comparison's country list, which only a hydrated page can do. Opening is idempotent,
 * so it is retried until it works, and everything after it can act once: a retried toggle
 * (add, remove) could flip twice. The list is closed again so it does not cover the chips.
 */
async function hydratedCombobox(page: Page): Promise<Locator> {
  const input = comparison(page).getByRole('combobox', { name: 'Add or remove a country' });
  await expect(async () => {
    await input.click();
    await expect(input).toHaveAttribute('aria-expanded', 'true', { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await input.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  return input;
}

test.describe('Waste & Recycling page', () => {
  test.describe('Server-rendered content', () => {
    test('should deliver the key figures, attribution and JSON-LD in the HTML', async ({
      request,
    }) => {
      const response = await request.get(PAGE_URL);
      expect(response.status()).toBe(200);
      const raw = await response.text();
      const html = raw.replaceAll('<!-- -->', '');
      // The text a visitor reads: React's text markers and the tags (the key figures wrap numbers in
      // <strong>) removed, so the sentences can be matched whole.
      const text = html.replace(/<[^>]+>/g, '');
      const footer = html.indexOf('<footer');

      expect(html.indexOf('2.33 billion tonnes')).toBeGreaterThan(-1);
      expect(html.indexOf('2.33 billion tonnes')).toBeLessThan(footer);
      expect(text).toContain('3.49 billion tonnes');
      expect(text).toContain('0.80 kg per person per day');
      expect(text).toContain('Among the 130 countries that report recycling');
      expect(text).toContain('about 46% of the world');
      expect(text).toContain('about 18% of municipal waste is recycled');
      expect(html).not.toContain('coming soon');
      expect(html).not.toContain('name="robots"');
      expect(html.match(/"@context":"https:\/\/schema.org","@type":"Dataset"/g)).toHaveLength(1);
    });

    test('should have the live title, description and canonical URL', async ({ page }) => {
      await page.goto(PAGE_URL);

      await expect(page).toHaveTitle(categoryInfo.title);
      await expect(
        page.getByRole('heading', { level: 1, name: 'Waste & Recycling' }),
      ).toBeVisible();
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        CATEGORY_DESCRIPTION_SAMPLES['waste-recycling'],
      );
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        'content',
        'Waste Generation & Recycling by Country',
      );
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
        'content',
        'Waste Generation & Recycling by Country',
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        /\/waste-recycling\/$/,
      );
    });

    test('should credit the World Bank with its license and update date', async ({ page }) => {
      await page.goto(PAGE_URL);

      const attribution = page.getByTestId('waste-attribution');
      await expect(attribution).toContainText('World Bank (CC BY 4.0)');
      await expect(attribution).toContainText('Mar 11, 2026');
      await expect(attribution.getByRole('link', { name: 'World Bank' })).toHaveAttribute(
        'href',
        /datacatalog\.worldbank\.org/,
      );
    });
  });

  test.describe('World map', () => {
    test('should show the map and switch the measure', { tag: '@smoke' }, async ({ page }) => {
      // The map alone may take 20 s to load under parallel load.
      test.setTimeout(60_000);
      await page.goto(PAGE_URL);

      await expect(map(page).getByRole('radio', { name: 'Recycled', exact: true })).toBeChecked();
      // The map loads when it scrolls into view.
      await map(page).scrollIntoViewIfNeeded();
      await expect(map(page).getByTestId('echart').locator('svg').first()).toBeVisible({
        timeout: 20_000,
      });

      await measureToggle(page).getByText('Per person', { exact: true }).click();

      await expect(
        page.getByRole('heading', { level: 2, name: /Municipal waste per person per day/ }),
      ).toBeVisible();
      await expect(page.getByRole('list', { name: /kilograms of waste per person/ })).toBeVisible();
    });

    test(
      'should not overflow horizontally at a narrow width',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 800 });
        await page.goto(PAGE_URL);
        await expect(map(page)).toBeVisible();

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      },
    );

    test('should filter the country table by name', async ({ page }) => {
      await page.goto(PAGE_URL);

      await map(page).getByText('View data table').click();
      await map(page).getByRole('searchbox').fill('arg');

      const region = page.getByTestId('waste-country-region');
      await expect(region.getByRole('rowheader')).toHaveText(['Argentina']);
      await expect(region.getByRole('row', { name: /Argentina/ })).toContainText('—');
    });

    test(
      'should name composting as not reported for Brazil under recycled or composted',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);

        // Its visible text is shorter below `sm`: click the label, whichever text it shows.
        await measureToggle(page).locator('label').filter({ hasText: 'composted' }).click();
        await map(page).getByText('View data table').click();
        await map(page).getByRole('searchbox').fill('brazil');

        const brazil = page
          .getByTestId('waste-country-region')
          .getByRole('row', { name: /Brazil/ });
        await expect(brazil).toContainText('1.6%');
        await expect(brazil).toContainText('Composting is not reported');
      },
    );

    test('should paint the legend with the green ramp for recycling and the heat ramp for the rest', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);
      // The card's name is its title, which follows the measure: find the legend on the page.
      const firstSwatch = () =>
        page
          .getByRole('list', { name: /^Legend/ })
          .locator('[data-token]')
          .first();

      await expect(firstSwatch()).toHaveAttribute('data-token', 'chart-seq-good-1');
      await measureToggle(page).getByText('Uncollected', { exact: true }).click();
      await expect(firstSwatch()).toHaveAttribute('data-token', 'chart-seq-1');
    });

    test('should sort the table by a column and select a country in it', async ({ page }) => {
      await page.goto(PAGE_URL);
      await map(page).getByText('View data table').click();
      const region = page.getByTestId('waste-country-region');

      await region.getByRole('button', { name: /^Per person/ }).click();
      await expect(region.getByRole('columnheader', { name: /^Per person/ })).toHaveAttribute(
        'aria-sort',
        'descending',
      );
      const germany = region.getByRole('button', { name: 'Germany', exact: true });
      await germany.click();
      await expect(germany).toHaveAttribute('aria-pressed', 'true');
    });

    test('should show China as not reporting recycling in the table', async ({ page }) => {
      await page.goto(PAGE_URL);

      await map(page).getByText('View data table').click();
      await map(page).getByRole('searchbox').fill('china');

      const china = page
        .getByTestId('waste-country-region')
        .getByRole('row', { name: /^(?:\d+|—) China\b/ });
      await expect(china).toContainText('—');
      await expect(china).toContainText('0.3%');
    });
  });

  test.describe('Comparison', () => {
    test('should start with five countries and add Germany', async ({ page }) => {
      await page.goto(PAGE_URL);
      await showChart(comparison(page));

      const selected = comparison(page).getByRole('list', { name: 'Selected countries' });
      await expect(selected.getByRole('listitem')).toHaveCount(5);
      await expect(selected).not.toContainText('Germany');

      const input = await hydratedCombobox(page);
      await expect(input).not.toHaveAttribute('aria-disabled', 'true');
      await input.fill('germany');
      await input.press('Enter');
      await expect(selected).toContainText('Germany');
      await expect(selected.getByRole('listitem')).toHaveCount(6);

      await comparison(page).getByText('View data table: what happens to the waste').click();
      const row = treatmentTable(page).getByRole('row', { name: /^Germany/ });
      await expect(row).toContainText('47.0%');
    });

    test('should preselect the five most populous countries with treatment data', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);
      await showChart(comparison(page));

      const selected = comparison(page).getByRole('list', { name: 'Selected countries' });
      for (const name of ['China', 'India', 'United States', 'Indonesia', 'Brazil']) {
        await expect(selected).toContainText(name);
      }
      await expect(selected.getByRole('listitem')).toHaveCount(5);
    });

    test('should make the search unavailable at ten countries until one is removed', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);
      const input = await hydratedCombobox(page);
      const selected = comparison(page).getByRole('list', { name: 'Selected countries' });

      for (const name of ['Bangladesh', 'Russian Federation', 'Mexico', 'Japan', 'Ethiopia']) {
        await input.fill(name);
        await input.press('Enter');
        await expect(selected).toContainText(name);
      }
      await expect(selected.getByRole('listitem')).toHaveCount(10);

      await expect(input).toHaveAttribute('aria-disabled', 'true');
      await expect(input).toHaveAttribute('placeholder', 'Limit of 10 reached');
      await input.click({ force: true });
      await page.keyboard.type('germany');
      await expect(input).toHaveValue('');
      await expect(input).toHaveAttribute('aria-expanded', 'false');
      await expect(selected.getByRole('listitem')).toHaveCount(10);
      await expect(
        comparison(page).getByRole('status').filter({ hasText: 'Up to 10 countries' }),
      ).toHaveText('Comparing 10 countries. Up to 10 countries. Remove one to add another.');

      await comparison(page).getByRole('button', { name: 'Remove China' }).click();
      await expect(selected.getByRole('listitem')).toHaveCount(9);
      await expect(input).not.toHaveAttribute('aria-disabled', 'true');
      await expect(input).toHaveAttribute('placeholder', 'Search countries');
    });

    test('should name recycling as not reported for India in the table', async ({ page }) => {
      await page.goto(PAGE_URL);

      await comparison(page).getByText('View data table: what happens to the waste').click();

      const india = treatmentTable(page).getByRole('row', { name: /^India/ });
      await expect(india).toContainText('not reported');
    });

    test('should remove a country with its chip', async ({ page }) => {
      await page.goto(PAGE_URL);
      const selected = comparison(page).getByRole('list', { name: 'Selected countries' });

      await hydratedCombobox(page);
      await comparison(page).getByRole('button', { name: 'Remove India' }).click();

      await expect(selected.getByRole('listitem')).toHaveCount(4);
      await expect(selected).not.toContainText('India');
    });
  });

  test.describe('Projection', () => {
    test('should chart the world projection and say 2030 to 2050 are projections', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);
      await showChart(projection(page));

      await expect(
        projection(page).getByRole('heading', {
          level: 3,
          name: 'World: municipal waste generated (billion tonnes)',
        }),
      ).toBeVisible();
      await expect(projection(page)).toContainText('World Bank projections');

      await projection(page).getByText('View data table').click();
      await expect(projection(page).getByRole('table')).toContainText('3.49');
    });
  });
});
