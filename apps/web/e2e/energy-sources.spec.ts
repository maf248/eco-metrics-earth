import { expect, test, type Page } from '@playwright/test';

import { apiHeaders } from './utils/api-env.ts';
import {
  CATEGORY_DESCRIPTION_SAMPLES,
  CATEGORY_METADATA_TITLES,
  categoryPage,
} from './utils/pages';

const API_BASE_URL = process.env['API_BASE_URL'] || 'http://localhost:3001/api/v1';
const PAGE_URL = '/energy-sources/';
const KEY_FIGURES =
  /In \d{4}, renewables generated \d+\.\d% of the world's electricity\.\s*The largest single source was [a-z &]+, at \d+\.\d%\./;

const explorer = (page: Page) =>
  page.getByRole('region', { name: 'Explore the electricity mix by country' });
const donut = (page: Page) => page.getByTestId('energy-donut');
const measure = (page: Page, label: string) =>
  page.getByRole('group', { name: 'Measure' }).getByText(label);
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

test.describe('Energy Sources page', () => {
  test.describe('Core render', () => {
    test('should show neither the stale notice nor the unavailable state while the provider is healthy', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);

      await expect(page.getByTestId('echart').locator('svg').first()).toBeVisible();
      await expect(page.getByTestId('stale-data-notice')).toHaveCount(0);
      await expect(page.getByTestId('data-unavailable')).toHaveCount(0);
    });

    test(
      'should render the heading, key figures, chart and attribution with the Ember credit',
      { tag: '@smoke' },
      async ({ page }) => {
        const response = await page.goto(PAGE_URL);
        expect(response?.status()).toBe(200);

        await expect(page.getByRole('heading', { name: 'Energy Sources', level: 1 })).toBeVisible();
        await expect(page.getByTestId('energy-key-figures')).toContainText(KEY_FIGURES);
        await expect(page.getByTestId('echart').locator('svg').first()).toBeVisible();

        const attribution = page.getByTestId('energy-attribution');
        await expect(attribution).toContainText('Data:');
        await expect(attribution.getByRole('link', { name: 'Our World in Data' })).toHaveAttribute(
          'href',
          'https://ourworldindata.org',
        );
        await expect(attribution).toContainText('(CC BY 4.0)');
        await expect(attribution).toContainText('Ember');
        await expect(
          attribution.getByRole('link', { name: 'Yearly Electricity Data' }),
        ).toHaveAttribute('href', 'https://ember-energy.org/data/yearly-electricity-data/');
        await expect(attribution.getByRole('link', { name: 'CC BY 4.0' }).last()).toHaveAttribute(
          'href',
          'https://ember-energy.org/creative-commons/',
        );
        await expect(attribution.getByRole('link', { name: 'All data sources' })).toHaveAttribute(
          'href',
          '/data-sources/',
        );
      },
    );

    test.describe('without JavaScript', () => {
      test.use({ javaScriptEnabled: false });

      test('should include the key figures, the latest-year table and the year table in the server-rendered HTML', async ({
        page,
      }) => {
        const response = await page.goto(PAGE_URL);
        expect(response?.ok()).toBe(true);
        const html = (await response?.text()) ?? '';

        const figures = page.getByTestId('energy-key-figures');
        await expect(figures).toBeVisible();
        await expect(figures).toContainText(KEY_FIGURES);
        expect(html).toContain('World: electricity mix in 2025');
        expect(html).toContain('World: electricity share by source, 2000–2025');
        expect(html).toContain('View data table');
        expect(html).toContain('Coal (%)');
      });
    });

    test('should declare a single schema.org Dataset based on two datasets', async ({
      request,
    }) => {
      const html = await (await request.get(PAGE_URL)).text();
      const blocks = [
        ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
      ];

      expect(blocks).toHaveLength(1);
      const dataset = JSON.parse(blocks[0][1]);
      expect(dataset['@type']).toBe('Dataset');
      expect(dataset.url).toMatch(/\/energy-sources\/$/);
      expect(dataset.name).toBe('Electricity generation mix by country, 2000–2025');
      expect(dataset.temporalCoverage).toBe('2000/2025');
      expect(dataset.variableMeasured).toHaveLength(2);
      expect(dataset.isBasedOn).toHaveLength(2);
      expect(dataset.isBasedOn[0].publisher.name).toBe('Our World in Data');
      expect(dataset.isBasedOn[1].publisher.name).toBe('Ember');
    });

    test('should have the correct title, description and canonical URL', async ({ page }) => {
      await page.goto(PAGE_URL);

      const description = CATEGORY_DESCRIPTION_SAMPLES['energy-sources'];
      await expect(page).toHaveTitle(categoryPage('energy-sources').title);
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
        CATEGORY_METADATA_TITLES['energy-sources'],
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        /\/energy-sources\/$/,
      );
    });

    test('should state the methodology and offer the two measures', async ({ page }) => {
      await page.goto(PAGE_URL);

      const note = page.getByTestId('energy-methodology');
      await expect(note).toContainText('electricity generation only');
      await expect(note).toContainText('geothermal, wave and tidal');
      await expect(note).toContainText('starts in 2000');
      await expect(page.getByRole('radio', { name: 'Share (%)' })).toBeChecked();
      await expect(page.getByRole('radio', { name: 'Generation (TWh)' })).not.toBeChecked();
    });
  });

  test.describe('Interaction', () => {
    test(
      'should select Argentina and Generation (TWh) and update chart, donut and year table',
      { tag: '@smoke' },
      async ({ page }) => {
        const errors = collectErrors(page);
        await page.goto(PAGE_URL);

        await selectCountry(page, 'arg');
        await measure(page, 'Generation (TWh)').click();

        await expect(country(page)).toHaveValue('Argentina');
        await expect(
          page.getByRole('heading', {
            level: 3,
            name: 'Argentina: electricity generation by source (TWh)',
          }),
        ).toBeVisible();
        await expect(
          page.getByRole('heading', { level: 3, name: /^Argentina: electricity mix in \d{4}$/ }),
        ).toBeVisible();
        await explorer(page).getByText('View data table').click();
        await expect(
          explorer(page).getByRole('columnheader', { name: 'Coal (TWh)' }),
        ).toBeVisible();

        await measure(page, 'Share (%)').click();
        await expect(explorer(page).getByRole('columnheader', { name: 'Coal (%)' })).toBeVisible();
        expect(new URL(page.url()).pathname).toBe(PAGE_URL);
        expect(errors).toEqual([]);
      },
    );

    test('should use the entity latest year in the donut heading', async ({ page }) => {
      await page.goto(PAGE_URL);

      await selectCountry(page, 'alg');

      // Algeria stopped reporting after 2024 in the fixture: its 2025 row holds only zeros.
      await expect(
        page.getByRole('heading', { level: 3, name: 'Algeria: electricity mix in 2024' }),
      ).toBeVisible();
    });

    test('should show em dashes in the year table for sources a country has no value for', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);

      await selectCountry(page, 'bosnia');
      await explorer(page).getByText('View data table').click();

      // Bosnia and Herzegovina reports no gas in 2000 in the fixture (a blank cell, not a zero).
      const row = explorer(page)
        .getByRole('row')
        .filter({ has: page.getByRole('rowheader', { name: '2000', exact: true }) });
      await expect(row).toContainText('—');
      await expect(page.getByTestId('energy-latest-table')).toContainText(
        'Bosnia and Herzegovina: electricity mix in 2025',
      );
    });

    test('should fit the year table in the card at 1280 px, with two-line headers', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(PAGE_URL);
      await explorer(page).getByText('View data table').click();

      const region = explorer(page).getByRole('region', { name: /^Data table for/ });
      const {
        table,
        region: regionWidth,
        header,
        line,
      } = await region.evaluate((element) => {
        const th = element.querySelector('thead th:last-child') as HTMLElement;
        return {
          table: (element.querySelector('table') as HTMLElement).offsetWidth,
          region: element.clientWidth,
          header: th.offsetHeight,
          line: Number.parseFloat(getComputedStyle(th).lineHeight),
        };
      });
      expect(table).toBeLessThanOrEqual(regionWidth);
      // "Bioenergy & other renewables (%)": two lines of text plus the cell padding.
      expect(header).toBeLessThan(line * 3);
    });

    test('should mount the donut only after it scrolls into view', async ({ page }) => {
      await page.goto(PAGE_URL);
      await expect(page.getByTestId('echart').locator('svg').first()).toBeVisible();

      await expect(donut(page).getByTestId('chart-skeleton')).toHaveCount(1);
      await expect(donut(page).getByTestId('echart')).toHaveCount(0);

      await donut(page).scrollIntoViewIfNeeded();

      await expect(donut(page).getByTestId('echart').locator('svg').first()).toBeVisible();
      await expect(page.getByTestId('echart')).toHaveCount(2);
    });

    test('should not request the BFF or change the URL on interaction', async ({ page }) => {
      await page.goto(PAGE_URL);
      const requests: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/v1/')) requests.push(request.url());
      });

      await selectCountry(page, 'arg');
      await measure(page, 'Generation (TWh)').click();

      expect(requests).toEqual([]);
      expect(new URL(page.url()).search).toBe('');
    });

    test('should log no console errors while the donut mounts and the theme changes', async ({
      page,
    }) => {
      const errors = collectErrors(page);
      await page.goto(PAGE_URL);
      await donut(page).scrollIntoViewIfNeeded();
      await expect(donut(page).getByTestId('echart').locator('svg').first()).toBeVisible();

      await page.getByRole('button', { name: 'Toggle light/dark mode' }).click();

      expect(errors).toEqual([]);
    });
  });

  test.describe('Narrow viewport (375 px)', () => {
    test.use({ viewport: { width: 375, height: 780 } });

    test(
      'should not scroll the page horizontally with the year table open',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        await expect(page.getByTestId('echart').locator('svg').first()).toBeVisible();

        await explorer(page).getByText('View data table').click();

        const region = explorer(page).getByRole('region', {
          name: 'Data table for World, scrollable',
        });
        const scrolls = await region.evaluate((node) => node.scrollWidth > node.clientWidth);
        expect(scrolls).toBe(true);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
        const box = await country(page).boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      },
    );

    test(
      'should wrap both legends below their plots, all eight sources visible and no pager',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        await donut(page).scrollIntoViewIfNeeded();
        // The donut mounts on scroll and fetches the pie chunk, which the dev server compiles
        // on first request: slower than the default under a full parallel run.
        await expect(page.getByTestId('echart')).toHaveCount(2, { timeout: 15_000 });

        for (const chart of await page.getByTestId('echart').all()) {
          await expect(chart.locator('svg text', { hasText: 'Solar' })).toBeVisible();
          const layout = await chart.evaluate((node) => {
            const legendNames = [
              'Coal',
              'Gas',
              'Oil',
              'Nuclear',
              'Hydro',
              'Wind',
              'Solar',
              'Bioenergy & other renewables',
            ];
            const svg = node.querySelector('svg') as SVGSVGElement;
            const svgBox = svg.getBoundingClientRect();
            const texts = [...svg.querySelectorAll('text')];
            const legend = texts.filter((text) => legendNames.includes(text.textContent ?? ''));
            const legendTop = Math.min(...legend.map((text) => text.getBoundingClientRect().top));
            // The plot: year labels, and the areas or the ring (large paths). The legend's own
            // background box is a large path too, so paths starting inside the legend are not.
            const plotBottoms = [
              ...texts.filter((text) => /^\d{4}$/.test(text.textContent ?? '')),
              ...[...svg.querySelectorAll('path')].filter((path) => {
                const box = path.getBoundingClientRect();
                return box.height > 40 && box.top < legendTop - 20;
              }),
            ].map((element) => element.getBoundingClientRect().bottom);
            return {
              names: legend.map((text) => text.textContent),
              rows: new Set(legend.map((text) => Math.round(text.getBoundingClientRect().top)))
                .size,
              gap: legendTop - Math.max(...plotBottoms),
              inside: legend.every((text) => {
                const box = text.getBoundingClientRect();
                return (
                  box.left >= svgBox.left &&
                  box.right <= svgBox.right &&
                  box.bottom <= svgBox.bottom
                );
              }),
              pager: texts.some((text) => /^\d+\/\d+$/.test(text.textContent ?? '')),
            };
          });

          expect(new Set(layout.names).size).toBe(8);
          expect(layout.rows).toBeGreaterThan(1);
          expect(layout.inside).toBe(true);
          expect(layout.pager).toBe(false);
          expect(layout.gap).toBeGreaterThanOrEqual(8);
        }
      },
    );

    test(
      'should give back the extra legend room when the chart widens',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        const chart = page.getByTestId('echart').first();
        await expect(chart.locator('svg text', { hasText: 'Solar' })).toBeVisible();

        // Rows of the legend and the space between the year labels and its first row.
        const legendLayout = () =>
          chart.evaluate((node) => {
            const texts = [...node.querySelectorAll('svg text')];
            const year = texts.find((text) => /^\d{4}$/.test(text.textContent ?? ''));
            const names = ['Coal', 'Gas', 'Wind', 'Bioenergy & other renewables'];
            const tops = texts
              .filter((text) => names.includes(text.textContent ?? ''))
              .map((text) => Math.round(text.getBoundingClientRect().top));
            const yearBottom = year?.getBoundingClientRect().bottom ?? 0;
            return { rows: new Set(tops).size, gap: Math.min(...tops) - yearBottom };
          });
        expect((await legendLayout()).rows).toBeGreaterThan(1);

        await page.setViewportSize({ width: 1440, height: 780 });
        // One row now; a reserve left over from the narrow width would leave a ~50 px blank strip.
        await expect.poll(async () => (await legendLayout()).rows).toBe(1);
        expect((await legendLayout()).gap).toBeLessThan(40);
      },
    );
  });

  test.describe('API', () => {
    test('should serve nothing before 2000 and aligned arrays', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/energy-sources`, {
        headers: apiHeaders(),
      });

      expect(response.status()).toBe(200);
      const { data } = await response.json();
      expect(data.startYear).toBe(2000);
      expect(data.unit).toBe('TWh');
      expect(data.origin.producer).toBe('Ember');
      const length = data.endYear - 2000 + 1;
      for (const entity of data.entities) {
        expect(Object.keys(entity.generation)).toHaveLength(8);
        for (const values of Object.values<unknown[]>(entity.generation)) {
          expect(values).toHaveLength(length);
        }
      }
    });
  });
});
