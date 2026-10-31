import { expect, test, type Page } from '@playwright/test';

import {
  CATEGORY_DESCRIPTION_SAMPLES,
  CATEGORY_METADATA_TITLES,
  categoryPage,
} from './utils/pages';

const PAGE_URL = '/global-temperature/';
const KEY_FIGURES =
  /In \d{4} the world's average surface temperature was [+−]\d\.\d{2} °C relative to the 1991–2020 average\./;
const WARMEST_YEAR = /The warmest year since 1940 was \d{4}, at [+−]\d\.\d{2} °C\./;
const REGIONAL_INDICATORS = /[\u{1F1E6}-\u{1F1FF}]/u;

/** The per-country explorer; the page also has the long-run section with its own table. */
const explorer = (page: Page) =>
  page.getByRole('region', { name: 'Explore temperature by country' });
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

/** Visible text of the server-rendered HTML: tags removed, the apostrophe entity decoded. */
function textOf(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'");
}

test.describe('Global Temperature page', () => {
  test.describe('Core render', { tag: '@smoke' }, () => {
    test('should show neither the stale notice nor the unavailable state while the provider is healthy', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);

      await expect(chart(page).locator('svg').first()).toBeVisible();
      await expect(page.getByTestId('stale-data-notice')).toHaveCount(0);
      await expect(page.getByTestId('data-unavailable')).toHaveCount(0);
    });

    test('should render the heading, key figures, chart and attribution with the Copernicus credit', async ({
      page,
    }) => {
      const response = await page.goto(PAGE_URL);
      expect(response?.status()).toBe(200);

      await expect(
        page.getByRole('heading', { name: 'Global Temperature', level: 1 }),
      ).toBeVisible();
      const figures = page.getByTestId('global-temperature-key-figures');
      await expect(figures).toContainText(KEY_FIGURES);
      await expect(figures).toContainText(WARMEST_YEAR);
      await expect(chart(page).locator('svg').first()).toBeVisible();

      const attribution = page.getByTestId('global-temperature-attribution');
      await expect(attribution).toContainText('Data:');
      await expect(attribution.getByRole('link', { name: 'Our World in Data' })).toHaveAttribute(
        'href',
        'https://ourworldindata.org',
      );
      await expect(attribution).toContainText('(CC BY 4.0)');
      await expect(attribution).not.toContainText('version 2026-10-12');
      await expect(attribution).toContainText(
        'Contains modified Copernicus Climate Change Service information',
      );
      await expect(attribution.getByRole('link', { name: 'CC BY 4.0' }).last()).toHaveAttribute(
        'href',
        'https://creativecommons.org/licenses/by/4.0/',
      );
      await expect(attribution).toContainText('Neither the European Commission nor ECMWF');
      await expect(attribution.getByRole('link', { name: 'All data sources' })).toHaveAttribute(
        'href',
        '/data-sources/',
      );
    });

    test('should include the signed key figures and the default table in the server-rendered HTML', async ({
      request,
    }) => {
      const html = await (await request.get(PAGE_URL)).text();
      const text = textOf(html);

      expect(text).toMatch(KEY_FIGURES);
      expect(text).toMatch(WARMEST_YEAR);
      expect(html).toContain('World: annual temperature anomaly');
      expect(html).toContain('View data table');
    });

    test('should declare a single schema.org Dataset based on three datasets', async ({
      request,
    }) => {
      const html = await (await request.get(PAGE_URL)).text();
      const blocks = [
        ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
      ];

      expect(blocks).toHaveLength(1);
      const dataset = JSON.parse(blocks[0][1]);
      expect(dataset['@type']).toBe('Dataset');
      expect(dataset.url).toMatch(/\/global-temperature\/$/);
      expect(dataset.name).toMatch(
        /^Global temperature anomalies by country and since pre-industrial times, 1850–\d{4}$/,
      );
      expect(dataset.description.length).toBeGreaterThanOrEqual(50);
      expect(dataset.temporalCoverage).toMatch(/^1850\/\d{4}$/);
      expect(dataset.variableMeasured).toHaveLength(2);
      expect(dataset.isBasedOn).toHaveLength(3);
      expect(dataset.isBasedOn[0].publisher.name).toBe('Our World in Data');
      expect(dataset.isBasedOn[1].publisher.name).toBe('Copernicus Climate Change Service (C3S)');
      expect(dataset.isBasedOn[2].publisher.name).toBe('Met Office Hadley Centre');
    });

    test('should have the correct title, description and canonical URL', async ({ page }) => {
      await page.goto(PAGE_URL);

      const description = CATEGORY_DESCRIPTION_SAMPLES['global-temperature'];
      await expect(page).toHaveTitle(categoryPage('global-temperature').title);
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
        CATEGORY_METADATA_TITLES['global-temperature'],
      );
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
        'content',
        CATEGORY_METADATA_TITLES['global-temperature'],
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        /\/global-temperature\/$/,
      );
    });

    test('should have no measure toggle and state the methodology', async ({ page }) => {
      await page.goto(PAGE_URL);

      await expect(page.getByRole('radio')).toHaveCount(0);
      const note = page.getByTestId('global-temperature-methodology');
      await expect(note).toContainText('not warming since pre-industrial times');
      await expect(note).toContainText('land and ocean');
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

      const boxes = [
        await country(page).boundingBox(),
        await explorer(page).locator('details summary').boundingBox(),
      ];
      for (const box of boxes) {
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
        page.getByRole('heading', {
          level: 3,
          name: 'Argentina: annual temperature anomaly (°C, relative to the 1991–2020 average)',
        }),
      ).toBeVisible();
      await expect(page.locator('.fi-ar')).toBeVisible();
      expect(await page.locator('main').innerText()).not.toMatch(REGIONAL_INDICATORS);
      await expect(
        page.getByRole('status').filter({ hasText: 'Showing temperature anomaly' }),
      ).toHaveText('Showing temperature anomaly for Argentina');
      expect(errors).toEqual([]);
    });

    test('should not change the URL when the selection changes', async ({ page }) => {
      await page.goto(PAGE_URL);

      await selectCountry(page, 'arg');

      expect(new URL(page.url()).pathname).toBe(PAGE_URL);
      expect(new URL(page.url()).search).toBe('');
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
      await input.press('ArrowDown');
      await input.press('Enter');

      await expect(input).toHaveAttribute('aria-expanded', 'false');
      await expect(input).not.toHaveValue('World');

      await input.press('ArrowDown');
      await input.press('Escape');
      await expect(input).toHaveAttribute('aria-expanded', 'false');
    });

    test('should show signed values and an em dash for a missing year in the data table', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);
      await selectCountry(page, 'arg');

      await expect(explorer(page).locator('details')).not.toHaveAttribute('open', '');
      await explorer(page).getByText('View data table').click();

      const table = explorer(page).getByRole('table');
      await expect(table).toContainText('Argentina: annual temperature anomaly relative to');
      await expect(
        table.getByRole('columnheader', { name: 'Anomaly (°C vs 1991–2020 average)' }),
      ).toBeVisible();
      const rows = table.locator('tbody tr');
      await expect(rows.first().locator('th')).toHaveText('2025');
      // Argentina's 1960 value is missing in the fixture; 1950 is below the baseline.
      await expect(rows.filter({ has: page.locator('th', { hasText: /^1960$/ }) })).toContainText(
        '—',
      );
      await expect(rows.filter({ has: page.locator('th', { hasText: /^1950$/ }) })).toContainText(
        /−\d\.\d{2}/,
      );
      expect(await table.innerText()).not.toMatch(/-\d/);
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

    test('should draw the labelled zero reference line', async ({ page }) => {
      await page.goto(PAGE_URL);

      await expect(chart(page).locator('svg text', { hasText: '1991–2020 average' })).toBeVisible();
    });

    test('should log no console errors or hydration warnings', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(PAGE_URL);
      await expect(chart(page).locator('svg').first()).toBeVisible();

      await selectCountry(page, 'arg');
      await page.getByRole('button', { name: 'Toggle light/dark mode' }).click();

      expect(errors).toEqual([]);
    });
  });

  test.describe('Pre-industrial series', () => {
    const PRE_INDUSTRIAL =
      /In \d{4} the world was \+\d\.\d{2} °C warmer than the 1861–1890 \(pre-industrial\) average\./;
    const longRun = (page: Page) =>
      page.locator('section', {
        has: page.getByRole('heading', { level: 2, name: /Global temperature since 1850/ }),
      });

    test('should include the pre-industrial figure in the server-rendered HTML', async ({
      request,
    }) => {
      const text = textOf(await (await request.get(PAGE_URL)).text());

      expect(text).toMatch(PRE_INDUSTRIAL);
      expect(text).toContain('1861–1890 (pre-industrial)');
    });

    test('should show both baselines in the key figures', async ({ page }) => {
      await page.goto(PAGE_URL);

      const figures = page.getByTestId('global-temperature-key-figures');
      await expect(figures).toContainText('relative to the 1991–2020 average');
      await expect(page.getByTestId('global-temperature-preindustrial-figure')).toContainText(
        PRE_INDUSTRIAL,
      );
    });

    test('should render the long-run chart only after it scrolls into view', async ({ page }) => {
      await page.goto(PAGE_URL);
      const section = longRun(page);
      await expect(section.getByRole('heading', { level: 2 })).toHaveText(
        'Global temperature since 1850, relative to 1861–1890',
      );

      // Not yet near the viewport: the same-height skeleton stands in for the chart.
      await expect(section.getByTestId('chart-skeleton')).toHaveCount(1);
      await expect(section.getByTestId('echart')).toHaveCount(0);

      await section.scrollIntoViewIfNeeded();

      await expect(section.getByTestId('echart').locator('svg').first()).toBeVisible();
      await expect(section.locator('svg text', { hasText: '1861–1890 average' })).toBeVisible();
      await expect(section.locator('svg text', { hasText: '1.5 °C' })).toBeVisible();
      await expect(section.getByRole('combobox')).toHaveCount(0);
    });

    test('should show its own data table with signed values and the Met Office credit', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);
      const section = longRun(page);
      await section.scrollIntoViewIfNeeded();

      await section.getByText('View data table').click();
      const table = section.getByRole('table');
      await expect(
        table.getByRole('columnheader', { name: 'Mean (°C vs 1861–1890)' }),
      ).toBeVisible();
      const rows = table.locator('tbody tr');
      await expect(rows.first().locator('th')).toHaveText('2025');
      await expect(rows.first()).toContainText('+1.41');
      // 1850 is below the baseline; 1900 has a blank lower bound in the fixture.
      await expect(rows.filter({ has: page.locator('th', { hasText: /^1850$/ }) })).toContainText(
        /\u2212\d\.\d{2}/,
      );
      await expect(rows.filter({ has: page.locator('th', { hasText: /^1900$/ }) })).toContainText(
        '—',
      );
      await expect(page.getByRole('table', { includeHidden: true })).toHaveCount(2);

      const credit = page.getByTestId('global-temperature-global-origin');
      await expect(credit).toContainText('Met Office Hadley Centre');
      await expect(credit.getByRole('link', { name: 'HadCRUT5' })).toBeVisible();
      await expect(
        credit.getByRole('link', { name: 'Open Government Licence v3.0' }),
      ).toHaveAttribute(
        'href',
        'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
      );
      await expect(credit).not.toContainText('Morice et al. (2021)');
      await expect(page.getByTestId('global-temperature-paris-note')).toContainText(
        'does not by itself mean the limit has been breached',
      );
    });

    test('should log no console errors while the long-run chart mounts and the theme changes', async ({
      page,
    }) => {
      const errors = collectErrors(page);
      await page.goto(PAGE_URL);
      await longRun(page).scrollIntoViewIfNeeded();
      await expect(longRun(page).getByTestId('echart').locator('svg').first()).toBeVisible();

      await page.getByRole('button', { name: 'Toggle light/dark mode' }).click();

      expect(errors).toEqual([]);
    });
  });
});
