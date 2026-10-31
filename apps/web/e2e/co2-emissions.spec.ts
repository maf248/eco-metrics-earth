import { expect, test, type Page } from '@playwright/test';

import {
  CATEGORY_DESCRIPTION_SAMPLES,
  CATEGORY_METADATA_TITLES,
  categoryPage,
} from './utils/pages';

const API_BASE_URL = process.env['API_BASE_URL'] || 'http://localhost:3001/api/v1';
const PAGE_URL = '/co2-emissions/';
const KEY_FIGURES =
  /In \d{4} the world emitted [\d,.]+ million tonnes of CO2, [\d,.]+ tonnes per person\./;
const REGIONAL_INDICATORS = /[\u{1F1E6}-\u{1F1FF}]/u;
const MAX_FLAG_REQUESTS = 40;

const chart = (page: Page) => page.getByTestId('echart');
const country = (page: Page) => page.getByRole('combobox', { name: 'Country' });

/** Collects console errors and uncaught page errors for the lifetime of the page. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Selects a country through the combobox by typing and pressing Enter. */
async function selectCountry(page: Page, query: string): Promise<void> {
  await country(page).click();
  await country(page).fill(query);
  await country(page).press('Enter');
}

test.describe('CO2 Emissions page', () => {
  test.describe('Core render', { tag: '@smoke' }, () => {
    test('should show neither the stale notice nor the unavailable state while the provider is healthy', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);

      await expect(chart(page).locator('svg').first()).toBeVisible();
      await expect(page.getByTestId('stale-data-notice')).toHaveCount(0);
      await expect(page.getByTestId('data-unavailable')).toHaveCount(0);
    });

    test('should render the heading, key figures, chart and attribution', async ({ page }) => {
      const response = await page.goto(PAGE_URL);
      expect(response?.status()).toBe(200);

      await expect(page.getByRole('heading', { name: 'CO2 Emissions', level: 1 })).toBeVisible();
      await expect(page.getByTestId('co2-key-figures')).toHaveText(KEY_FIGURES);
      await expect(chart(page).locator('svg').first()).toBeVisible();

      const attribution = page.getByTestId('co2-attribution');
      await expect(attribution).toContainText('Data:');
      await expect(attribution.getByRole('link', { name: 'Our World in Data' })).toHaveAttribute(
        'href',
        'https://ourworldindata.org',
      );
      await expect(attribution).toContainText('(CC BY 4.0)');
      await expect(attribution).toContainText('Global Carbon Budget');
      await expect(attribution).not.toContainText('version');
      await expect(attribution.getByRole('link', { name: 'All data sources' })).toHaveAttribute(
        'href',
        '/data-sources/',
      );
    });

    test('should credit the Global Carbon Project origin in the attribution', async ({ page }) => {
      await page.goto(PAGE_URL);

      const origin = page.getByTestId('co2-attribution').getByTestId('co2-origin');
      await expect(origin).toContainText('Global Carbon Project');
      await expect(origin.getByRole('link', { name: 'Global Carbon Budget' })).toHaveAttribute(
        'href',
        'https://globalcarbonbudget.org/',
      );
      await expect(origin.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
        'href',
        'https://creativecommons.org/licenses/by/4.0/',
      );
    });

    test('should include the key figures and the default table in the server-rendered HTML', async ({
      request,
    }) => {
      const html = await (await request.get(PAGE_URL)).text();

      expect(html).toMatch(/the world emitted/);
      expect(html).toContain('World: total CO2 emissions');
      expect(html).toContain('View data table');
    });

    test('should declare a schema.org Dataset in the server-rendered HTML', async ({ request }) => {
      const html = await (await request.get(PAGE_URL)).text();
      const blocks = [
        ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
      ];

      expect(blocks).toHaveLength(1);
      const dataset = JSON.parse(blocks[0][1]);
      expect(dataset['@type']).toBe('Dataset');
      expect(dataset.url).toMatch(/\/co2-emissions\/$/);
      expect(dataset.name).toMatch(/^CO2 emissions by country, 1950–\d{4}$/);
      expect(dataset.description.length).toBeGreaterThanOrEqual(50);
      expect(dataset.temporalCoverage).toMatch(/^1950\/\d{4}$/);
      expect(dataset.license).toBe('https://creativecommons.org/licenses/by/4.0/');
      expect(dataset.variableMeasured).toHaveLength(2);
    });

    test('should have the correct title, description and canonical URL', async ({ page }) => {
      await page.goto(PAGE_URL);

      const description = CATEGORY_DESCRIPTION_SAMPLES['co2-emissions'];
      await expect(page).toHaveTitle(categoryPage('co2-emissions').title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        description,
      );
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
        'content',
        description,
      );
      await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
        'content',
        description,
      );
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        'content',
        CATEGORY_METADATA_TITLES['co2-emissions'],
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        /\/co2-emissions\/$/,
      );
    });

    test('should not overflow horizontally', async ({ page }) => {
      await page.goto(PAGE_URL);
      await expect(chart(page).locator('svg').first()).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });

  test.describe('Narrow viewport (360 px)', () => {
    test.use({ viewport: { width: 360, height: 780 } });

    test('should not overflow and keep the controls at least 44 px tall', async ({ page }) => {
      await page.goto(PAGE_URL);
      await expect(chart(page).locator('svg').first()).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      const heights = [
        await country(page).boundingBox(),
        await page.getByText('Per capita', { exact: true }).boundingBox(),
        await page.locator('details summary').boundingBox(),
      ];
      for (const box of heights) {
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    });
  });

  test.describe('Country selection', { tag: '@smoke' }, () => {
    test('should select Argentina by typing, with its flag and chart title', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(PAGE_URL);

      await selectCountry(page, 'arg');

      await expect(country(page)).toHaveValue('Argentina');
      await expect(
        page.getByRole('heading', { level: 3, name: /^Argentina: total CO2 emissions/ }),
      ).toBeVisible();
      await expect(page.locator('.fi-ar')).toBeVisible();
      expect(await page.locator('main').innerText()).not.toMatch(REGIONAL_INDICATORS);
      await expect(page.getByRole('status').filter({ hasText: 'Showing total' })).toHaveText(
        'Showing total CO2 emissions for Argentina',
      );
      expect(errors).toEqual([]);
    });

    test('should show a globe, no flag, for World and request no flag images', async ({ page }) => {
      const flagRequests: string[] = [];
      page.on('request', (request) => {
        if (/\/_next\/static\/media\/.*\.svg/.test(request.url())) flagRequests.push(request.url());
      });
      await page.goto(PAGE_URL);
      await expect(chart(page).locator('svg').first()).toBeVisible();

      await expect(country(page)).toHaveValue('World');
      await expect(page.locator('[class*="fi-"]')).toHaveCount(0);
      expect(flagRequests).toEqual([]);
    });

    test('should not change the URL when the selection changes', async ({ page }) => {
      await page.goto(PAGE_URL);

      await selectCountry(page, 'arg');
      await page.getByText('Per capita', { exact: true }).click();

      expect(new URL(page.url()).pathname).toBe(PAGE_URL);
      expect(new URL(page.url()).search).toBe('');
    });
  });

  test.describe('Metric toggle', { tag: '@smoke' }, () => {
    test('should switch between total and per capita by click and arrow keys', async ({ page }) => {
      await page.goto(PAGE_URL);
      const total = page.getByRole('radio', { name: 'Total' });
      const perCapita = page.getByRole('radio', { name: 'Per capita' });
      await expect(total).toBeChecked();

      await page.getByText('Per capita', { exact: true }).click();
      await expect(perCapita).toBeChecked();
      await expect(
        page.getByRole('heading', { level: 3, name: /CO2 emissions per capita/ }),
      ).toBeVisible();

      await perCapita.focus();
      await perCapita.press('ArrowLeft');
      await expect(total).toBeChecked();
      await total.press('ArrowRight');
      await expect(perCapita).toBeChecked();
    });
  });

  test.describe('Interaction', () => {
    test('should support the full keyboard flow on the combobox', async ({ page }) => {
      await page.goto(PAGE_URL);
      const input = country(page);
      await input.focus();

      await input.press('ArrowDown');
      await expect(input).toHaveAttribute('aria-expanded', 'true');
      const options = page.getByRole('option');
      await expect(options.first()).toHaveAttribute('aria-selected', 'true');

      await input.press('End');
      await expect(options.last()).toHaveAttribute('aria-selected', 'true');
      await input.press('Home');
      await expect(options.first()).toHaveAttribute('aria-selected', 'true');
      await input.press('ArrowUp');
      await expect(options.last()).toHaveAttribute('aria-selected', 'true');
      await input.press('ArrowDown');
      await input.press('ArrowDown');
      await input.press('ArrowDown');
      await input.press('Enter');

      await expect(input).toHaveAttribute('aria-expanded', 'false');
      await expect(input).not.toHaveValue('World');

      await input.press('ArrowDown');
      await input.press('Escape');
      await expect(input).toHaveAttribute('aria-expanded', 'false');
      await input.fill('zz');
      await input.press('Tab');
      await expect(input).not.toHaveValue('zz');
    });

    test('should open the data table for the selected country', async ({ page }) => {
      await page.goto(PAGE_URL);
      await selectCountry(page, 'arg');

      const details = page.locator('details');
      await expect(details).not.toHaveAttribute('open', '');
      await page.getByText('View data table').click();

      await expect(page.getByRole('table')).toContainText('Argentina: annual CO2 emissions');
      const firstYear = page.getByRole('table').locator('tbody tr').first().locator('th');
      await expect(firstYear).toHaveText('2024');
    });

    test('should repaint the chart when the theme changes', async ({ page }) => {
      await page.goto(PAGE_URL);
      await expect(chart(page).locator('svg').first()).toBeVisible();
      const strokes = (): Promise<string> =>
        chart(page)
          .locator('svg')
          .first()
          .evaluate((svg) =>
            [...svg.querySelectorAll('path, text')]
              .map((node) => node.getAttribute('stroke') ?? node.getAttribute('fill') ?? '')
              .join('|'),
          );
      const before = await strokes();

      await page.getByRole('button', { name: 'Toggle light/dark mode' }).click();

      await expect.poll(strokes).not.toBe(before);
    });

    test('should request only a handful of flag images after opening the list', async ({
      page,
    }) => {
      const flagRequests = new Set<string>();
      page.on('request', (request) => {
        if (/\/_next\/static\/media\/.*\.svg/.test(request.url())) flagRequests.add(request.url());
      });
      await page.goto(PAGE_URL);

      await country(page).press('ArrowDown');
      await expect(page.getByRole('option').first()).toBeVisible();
      await page.waitForLoadState('networkidle');

      expect(flagRequests.size).toBeLessThan(MAX_FLAG_REQUESTS);
    });

    test('should log no console errors or hydration warnings', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(PAGE_URL);
      await expect(chart(page).locator('svg').first()).toBeVisible();

      await selectCountry(page, 'arg');
      await page.getByText('Per capita', { exact: true }).click();
      await page.getByRole('button', { name: 'Toggle light/dark mode' }).click();

      expect(errors).toEqual([]);
    });
  });

  test.describe('Dependencies health', () => {
    test('should report the provider up against the fixture server', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/health/dependencies`);

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('ok');
      expect(body.info.owid.status).toBe('up');
    });

    test('should keep liveness independent of the provider', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/health`);

      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ status: 'ok' });
    });
  });
});
