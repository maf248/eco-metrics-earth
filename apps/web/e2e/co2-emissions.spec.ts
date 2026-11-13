import { expect, test, type Page } from '@playwright/test';

import { apiHeaders } from './utils/api-env.ts';
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

/** The country explorer, scoped so the world map's chart below never matches. */
const explorer = (page: Page) => page.getByRole('region', { name: 'Explore emissions by country' });
const chart = (page: Page) => explorer(page).getByTestId('echart');
const perCapitaToggle = (page: Page) => explorer(page).getByText('Per capita', { exact: true });

/** Waits for the explorer's chart to draw. */
async function showExplorerChart(page: Page): Promise<void> {
  // Lazily loaded: allow for the chunk on a cold dev server.
  await expect(chart(page).locator('svg').first()).toBeVisible({ timeout: 20_000 });
}
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

/**
 * Selects a country through the combobox by typing and pressing Enter, retrying until the
 * selection sticks: typing before hydration (slower under parallel load) is lost.
 */
async function selectCountry(page: Page, query: string, expected = 'Argentina'): Promise<void> {
  await expect(async () => {
    await country(page).click();
    await country(page).fill(query);
    await country(page).press('Enter');
    await expect(country(page)).toHaveValue(expected, { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

test.describe('CO2 Emissions page', () => {
  test.describe('Core render', () => {
    test('should show neither the stale notice nor the unavailable state while the provider is healthy', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);

      await showExplorerChart(page);
      await expect(page.getByTestId('stale-data-notice')).toHaveCount(0);
      await expect(page.getByTestId('data-unavailable')).toHaveCount(0);
    });

    test(
      'should render the heading, key figures, chart and attribution',
      { tag: '@smoke' },
      async ({ page }) => {
        const response = await page.goto(PAGE_URL);
        expect(response?.status()).toBe(200);

        await expect(page.getByRole('heading', { name: 'CO2 Emissions', level: 1 })).toBeVisible();
        await expect(page.getByTestId('co2-key-figures')).toHaveText(KEY_FIGURES);
        await showExplorerChart(page);

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
      },
    );

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

    test('should server-render the map card and the ranking, but no map drawing', async ({
      request,
    }) => {
      const html = await (await request.get(PAGE_URL)).text();

      expect(html).toMatch(/CO2 emissions per capita, \d{4} \(tonnes per person\)/);
      expect(html).toContain('type="range"');
      expect(html).toContain('data-testid="chart-skeleton"');
      // React separates the caption's text and year with an empty comment.
      expect(html).toMatch(/Countries ranked by CO2 emissions per capita, (<!-- -->)?\d{4}/);
      expect(html).toMatch(/data-testid="co2-ranking-region"[\s\S]*<tbody><tr/);
      expect(html).not.toContain('data-testid="echart"');
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
      // Sources are CreativeWork: a nested Dataset would be validated as a Dataset item of its own.
      expect(blocks[0][1].match(/"@type":"Dataset"/g)).toHaveLength(1);
      for (const source of [dataset.isBasedOn].flat()) {
        expect(source['@type']).toBe('CreativeWork');
      }
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

    test('should not overflow horizontally', { tag: '@smoke' }, async ({ page }) => {
      await page.goto(PAGE_URL);
      await showExplorerChart(page);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });

  test.describe('Narrow viewport (360 px)', () => {
    test.use({ viewport: { width: 360, height: 780 } });

    test(
      'should not overflow and keep the controls at least 44 px tall',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        await showExplorerChart(page);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);

        const heights = [
          await country(page).boundingBox(),
          await perCapitaToggle(page).boundingBox(),
          await explorer(page).locator('details summary').boundingBox(),
        ];
        for (const box of heights) {
          expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
        }
      },
    );
  });

  test.describe('Country selection', () => {
    test(
      'should select Argentina by typing, with its flag and chart title',
      { tag: '@smoke' },
      async ({ page }) => {
        const errors = collectErrors(page);
        await page.goto(PAGE_URL);

        await selectCountry(page, 'arg');

        await expect(country(page)).toHaveValue('Argentina');
        await expect(
          page.getByRole('heading', { level: 3, name: /^Argentina: total CO2 emissions/ }),
        ).toBeVisible();
        await expect(explorer(page).locator('.fi-ar')).toBeVisible();
        expect(await page.locator('main').innerText()).not.toMatch(REGIONAL_INDICATORS);
        await expect(page.getByRole('status').filter({ hasText: 'Showing total' })).toHaveText(
          'Showing total CO2 emissions for Argentina',
        );
        expect(errors).toEqual([]);
      },
    );

    test('should show a globe, no flag, for World in the explorer', async ({ page }) => {
      await page.goto(PAGE_URL);
      await showExplorerChart(page);

      await expect(country(page)).toHaveValue('World');
      await expect(explorer(page).locator('[class*="fi-"]')).toHaveCount(0);
    });

    test('should not change the URL when the selection changes', async ({ page }) => {
      await page.goto(PAGE_URL);

      await selectCountry(page, 'arg');
      await perCapitaToggle(page).click();

      expect(new URL(page.url()).pathname).toBe(PAGE_URL);
      expect(new URL(page.url()).search).toBe('');
    });
  });

  test.describe('Metric toggle', () => {
    test(
      'should switch between total and per capita by click and arrow keys',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        const total = page.getByRole('radio', { name: 'Total' });
        const perCapita = page.getByRole('radio', { name: 'Per capita' });
        await expect(total).toBeChecked();

        await perCapitaToggle(page).click();
        await expect(perCapita).toBeChecked();
        await expect(
          page.getByRole('heading', { level: 3, name: /CO2 emissions per capita/ }),
        ).toBeVisible();

        await perCapita.focus();
        await perCapita.press('ArrowLeft');
        await expect(total).toBeChecked();
        await total.press('ArrowRight');
        await expect(perCapita).toBeChecked();
      },
    );
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

      const details = explorer(page).locator('details');
      await expect(details).not.toHaveAttribute('open', '');
      await explorer(page).getByText('View data table').click();

      const table = explorer(page).getByRole('table');
      await expect(table).toContainText('Argentina: annual CO2 emissions');
      const firstYear = table.locator('tbody tr').first().locator('th');
      await expect(firstYear).toHaveText('2024');
    });

    test('should repaint the chart when the theme changes', async ({ page }) => {
      await page.goto(PAGE_URL);
      await showExplorerChart(page);
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
      await showExplorerChart(page);

      await selectCountry(page, 'arg');
      await perCapitaToggle(page).click();
      await page.getByRole('button', { name: 'Toggle light/dark mode' }).click();

      expect(errors).toEqual([]);
    });
  });

  test.describe('World map', () => {
    const MAP_TITLE = /^CO2 emissions per capita, (\d{4}) \(tonnes per person\)$/;
    const card = (page: Page) => page.getByRole('region', { name: MAP_TITLE });
    const mapSvg = (page: Page) => card(page).getByTestId('echart').locator('svg').first();
    const ranking = (page: Page) => page.getByTestId('co2-ranking-region');
    const firstRanked = (page: Page) =>
      ranking(page).locator('tbody tr').first().getByRole('button');

    /** Opens the ranking, collapsed under "View data table" in the map card. */
    async function openRanking(page: Page): Promise<void> {
      await card(page).getByText('View data table').click();
      await expect(ranking(page)).toBeVisible();
    }

    /** Waits for the map to draw its countries. */
    async function showMap(page: Page): Promise<void> {
      // The map mounts once scrolled into view, then loads its geometry and lazy chunk: allow
      // for a cold dev server.
      await card(page).scrollIntoViewIfNeeded();
      await expect(mapSvg(page)).toBeVisible({ timeout: 20_000 });
      await expect.poll(() => mapSvg(page).locator('path').count()).toBeGreaterThan(100);
    }

    test(
      'should draw the map below the explorer, with legend, year slider and ranking',
      { tag: '@smoke' },
      async ({ page }) => {
        const errors = collectErrors(page);
        await page.goto(PAGE_URL);
        await showMap(page);

        const title = await card(page).getByRole('heading', { level: 2 }).innerText();
        const year = MAP_TITLE.exec(title)?.[1];
        await expect(page.getByRole('slider', { name: /^Year shown on the map/ })).toHaveValue(
          year ?? '',
        );
        await expect(card(page).getByRole('list', { name: /^Legend/ })).toContainText('No data');
        await expect(ranking(page)).toBeHidden();
        await openRanking(page);
        await expect(ranking(page).getByRole('table')).toContainText(
          `Countries ranked by CO2 emissions per capita, ${year}`,
        );

        const mapBox = await card(page).boundingBox();
        const explorerBox = await page
          .getByRole('region', { name: 'Explore emissions by country' })
          .boundingBox();
        expect(mapBox?.y ?? 0).toBeGreaterThan(explorerBox?.y ?? Infinity);
        expect(errors).toEqual([]);
      },
    );

    test('should show another year on the map and in the ranking', async ({ page }) => {
      await page.goto(PAGE_URL);
      await showMap(page);
      const slider = page.getByRole('slider', { name: /^Year shown on the map/ });
      const min = await slider.getAttribute('min');

      await openRanking(page);
      await slider.focus();
      await slider.press('Home');

      await expect(card(page).getByRole('heading', { level: 2 })).toContainText(`, ${min} (`);
      await expect(page.getByTestId('year-slider-value')).toHaveText(min ?? '');
      await expect(ranking(page).getByRole('table')).toContainText(`per capita, ${min}`);
    });

    test('should reverse the ranking from the per-capita header', async ({ page }) => {
      await page.goto(PAGE_URL);
      await openRanking(page);
      const sort = ranking(page).getByRole('button', { name: /^Per capita/ });
      const highest = await firstRanked(page).innerText();

      await sort.click();

      await expect(sort.locator('xpath=..')).toHaveAttribute('aria-sort', 'ascending');
      await expect(firstRanked(page)).not.toHaveText(highest);
      await sort.click();
      await expect(firstRanked(page)).toHaveText(highest);
    });

    test('should sort the ranking by total, both ways', async ({ page }) => {
      await page.goto(PAGE_URL);
      await openRanking(page);
      const total = ranking(page).getByRole('button', { name: /^Total/ });
      const totals = () =>
        ranking(page)
          .locator('tbody tr td:last-child')
          .allInnerTexts()
          .then((cells) => cells.map((cell) => Number(cell.replace(/,/g, ''))));

      await total.click();
      await expect(total.locator('xpath=..')).toHaveAttribute('aria-sort', 'descending');
      await expect(ranking(page).getByRole('table')).toContainText('ranked by total CO2 emissions');
      const descending = await totals();
      expect(descending).toEqual([...descending].sort((a, b) => b - a));

      await total.click();
      await expect(total.locator('xpath=..')).toHaveAttribute('aria-sort', 'ascending');
      await expect.poll(totals).toEqual([...descending].reverse());
    });

    test('should outline the country selected in the table on the map', async ({ page }) => {
      await page.goto(PAGE_URL);
      await showMap(page);
      const outlined = () => mapSvg(page).locator('path[stroke-width="1.5"]').count();
      expect(await outlined()).toBe(0);
      await openRanking(page);

      const argentina = ranking(page).getByRole('button', { name: 'Argentina' });
      await argentina.click();

      await expect(argentina).toHaveAttribute('aria-pressed', 'true');
      await expect(argentina.locator('xpath=ancestor::tr')).toHaveAttribute('aria-current', 'true');
      await expect.poll(outlined).toBeGreaterThan(0);

      await argentina.click();
      await expect(argentina).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(outlined).toBe(0);
    });

    test('should zoom with the map controls and reset the view', async ({ page }) => {
      await page.goto(PAGE_URL);
      await showMap(page);
      // Width of the widest drawn region: it grows with the zoom.
      const regionWidth = () =>
        mapSvg(page).evaluate((svg) =>
          Math.round(
            Math.max(
              ...[...svg.querySelectorAll('path')].map((p) => p.getBoundingClientRect().width),
            ),
          ),
        );
      // Read once an animation has settled (two equal reads in a row): a reset pressed while the
      // zoom still animates is overwritten when that animation ends.
      const settledWidth = async (): Promise<number> => {
        let previous = -1;
        await expect
          .poll(async () => {
            const width = await regionWidth();
            const settled = width === previous;
            previous = width;
            return settled;
          })
          .toBe(true);
        return previous;
      };
      const initial = await settledWidth();

      await card(page).getByRole('button', { name: 'Zoom in' }).click();
      await expect.poll(regionWidth).toBeGreaterThan(initial);
      await settledWidth();

      await card(page).getByRole('button', { name: 'Reset view' }).click();
      await expect.poll(regionWidth).toBe(initial);
    });

    test.describe('Narrow viewport (360 px)', () => {
      test.use({ viewport: { width: 360, height: 780 }, hasTouch: true });

      test(
        'should offer no zoom buttons and fit the ranking without overflow',
        { tag: '@smoke' },
        async ({ page }) => {
          await page.goto(PAGE_URL);
          await showMap(page);

          await expect(card(page).getByRole('button', { name: 'Zoom in' })).toHaveCount(0);
          await expect(card(page).getByRole('button', { name: 'Reset view' })).toHaveCount(0);
          await openRanking(page);
          await expect(ranking(page).locator('tbody .fi').first()).toBeVisible();
          const overflow = await ranking(page).evaluate((el) => el.scrollWidth - el.clientWidth);
          expect(overflow).toBeLessThanOrEqual(0);
        },
      );

      test(
        'should span the card, the map and the ranking across the whole screen width',
        { tag: '@smoke' },
        async ({ page }) => {
          await page.goto(PAGE_URL);
          await showMap(page);
          await openRanking(page);

          // Below `sm` the card bleeds through the page gutter and the map and the ranking
          // through the card padding, so all three run from one screen edge to the other.
          for (const locator of [card(page), card(page).getByTestId('echart'), ranking(page)]) {
            const box = await locator.boundingBox();
            if (!box) throw new Error('element box not found');
            expect(box.x).toBeCloseTo(0, 0);
            expect(box.width).toBeCloseTo(360, 0);
          }
        },
      );

      test('should show "Reset view" after the map is dragged and hide it after a reset', async ({
        page,
      }) => {
        await page.goto(PAGE_URL);
        await showMap(page);
        const reset = card(page).getByRole('button', { name: 'Reset view' });
        await expect(reset).toHaveCount(0);

        const box = await card(page).getByTestId('echart').boundingBox();
        if (!box) throw new Error('map box not found');
        const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 60, y + 10, { steps: 5 });
        await page.mouse.up();

        await expect(reset).toBeVisible();
        await reset.click();
        await expect(reset).toHaveCount(0);
      });
    });
  });

  test.describe('Dependencies health', () => {
    test('should report the provider up against the fixture server', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/health/dependencies`, {
        headers: apiHeaders(),
      });

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
