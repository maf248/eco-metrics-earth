import { expect, test, type Locator, type Page } from '@playwright/test';

import { apiHeaders } from './utils/api-env.ts';
import {
  CATEGORY_DESCRIPTION_SAMPLES,
  CATEGORY_METADATA_TITLES,
  categoryPage,
} from './utils/pages';

const API_BASE_URL = process.env['API_BASE_URL'] || 'http://localhost:3001/api/v1';
const PAGE_URL = '/deforestation/';

/**
 * The fixtures keep the real World values: 4,343,532,500 ha in 1990 and 4,140,214,500 ha in 2025
 * (a net loss of 203.3 million ha) and 31.905802% of the land in 2025. See
 * `e2e/fixtures/owid/README.md` for the entities and what each one is there to cover.
 */
const KEY_FIGURES =
  "Since 1990 the world has lost a net 203 million hectares of forest, an area the size of Mexico. Forests now cover 31.9% of the world's land.";
const MINUS = '\u2212';

/** A section is the region its own `<h2>` names. */
const section = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const explorer = (page: Page) => section(page, 'Forest area');
const changeCard = (page: Page) => section(page, 'Forest change since 1990');
const causeCard = (page: Page) => section(page, 'Tree cover loss by cause');
const country = (scope: Locator) => scope.getByRole('combobox', { name: 'Country' });
const chart = (scope: Locator) => scope.getByTestId('echart').locator('svg').first();
const mapSvg = (page: Page) => changeCard(page).getByTestId('echart').locator('svg').first();
const ranking = (page: Page) => page.getByTestId('forest-ranking-region');
const rankingRows = (page: Page) => ranking(page).locator('tbody tr');

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
async function selectCountry(scope: Locator, query: string, expected: string): Promise<void> {
  await expect(async () => {
    await country(scope).click();
    await country(scope).fill(query);
    await country(scope).press('Enter');
    await expect(country(scope)).toHaveValue(expected, { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

/** Waits for the explorer's chart to draw (lazily loaded: allow for a cold dev server). */
async function showExplorerChart(page: Page): Promise<void> {
  await expect(chart(explorer(page))).toBeVisible({ timeout: 20_000 });
}

/** Scrolls the map into view and waits for its countries. */
async function showMap(page: Page): Promise<void> {
  await changeCard(page).scrollIntoViewIfNeeded();
  await expect(mapSvg(page)).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => mapSvg(page).locator('path').count()).toBeGreaterThan(100);
}

/** Scrolls the cause section into view and waits for its chart. */
async function showCauseChart(page: Page): Promise<void> {
  await causeCard(page).scrollIntoViewIfNeeded();
  await expect(chart(causeCard(page))).toBeVisible({ timeout: 20_000 });
}

/** Opens the ranking, collapsed under "View data table" in the change card. */
async function openRanking(page: Page): Promise<void> {
  await changeCard(page).getByText('View data table').click();
  await expect(ranking(page)).toBeVisible();
}

/** The sort button of a ranking column, and the header cell that carries its `aria-sort`. */
const sortButton = (page: Page, name: RegExp) => ranking(page).getByRole('button', { name });
const sortHeader = (button: Locator) => button.locator('xpath=ancestor::th');

/** Presses Tab until `target` has focus, failing when it is not reached going forward. */
async function tabUntil(page: Page, target: Locator, limit = 80): Promise<void> {
  for (let press = 0; press < limit; press += 1) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('The target was not reached with the Tab key');
}

test.describe('Deforestation page', () => {
  test.describe('Core render', () => {
    test(
      'should render the heading, intro, key figures and the three sections',
      { tag: '@smoke' },
      async ({ page }) => {
        const response = await page.goto(PAGE_URL);
        expect(response?.status()).toBe(200);

        await expect(page.getByRole('heading', { name: 'Deforestation', level: 1 })).toBeVisible();
        await expect(
          page.getByText('How much forest is the world losing, where, and why?'),
        ).toBeVisible();
        await expect(page.getByTestId('forest-key-figures')).toBeVisible();
        await showExplorerChart(page);

        for (const name of [
          'Forest area',
          'Forest change since 1990',
          'Tree cover loss by cause',
        ]) {
          await expect(section(page, name).getByRole('heading', { level: 2, name })).toBeVisible();
        }
        await expect(
          changeCard(page).getByRole('heading', {
            level: 3,
            name: 'Change in forest area since 1990',
          }),
        ).toBeVisible();
      },
    );

    test('should show neither the stale notice nor the unavailable state while the provider is healthy', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);

      await showExplorerChart(page);
      await expect(page.getByTestId('stale-data-notice')).toHaveCount(0);
      await expect(page.getByTestId('data-unavailable')).toHaveCount(0);
    });

    test('should state the net loss and the share of land from the World fixture values', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);

      await expect(page.getByTestId('forest-key-figures')).toHaveText(KEY_FIGURES);
      await expect(page.getByTestId('forest-key-figures').locator('strong')).toHaveText([
        '203 million hectares',
        '31.9%',
      ]);
    });

    test('should include the key figures, the methodology and the first table in the server-rendered HTML', async ({
      request,
    }) => {
      const html = await (await request.get(PAGE_URL)).text();

      expect(html).toContain('How much forest is the world losing, where, and why?');
      expect(html).toContain('data-testid="forest-key-figures"');
      expect(html).toContain('a net');
      expect(html).toContain('data-testid="deforestation-methodology"');
      expect(html).toContain('World: forest area (million hectares)');
      expect(html).toContain('View data table');
      expect(html).toContain('data-testid="forest-ranking-region"');
      expect(html).not.toMatch(/<div hidden id="S:/);
    });

    test('should declare one schema.org Dataset with both sources as CreativeWork', async ({
      request,
    }) => {
      const html = await (await request.get(PAGE_URL)).text();
      const blocks = [
        ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
      ];

      expect(blocks).toHaveLength(1);
      const dataset = JSON.parse(blocks[0][1]);
      expect(dataset['@type']).toBe('Dataset');
      expect(dataset.url).toMatch(/\/deforestation\/$/);
      expect(dataset.name).toBe('Forest area and tree cover loss by country');
      expect(dataset.temporalCoverage).toBe('1990/2025');
      expect(dataset.variableMeasured.length).toBeGreaterThanOrEqual(2);
      expect(blocks[0][1].match(/"@type":"Dataset"/g)).toHaveLength(1);
      const sources = [dataset.isBasedOn].flat();
      expect(sources).toHaveLength(2);
      for (const source of sources) {
        expect(source['@type']).toBe('CreativeWork');
      }
    });

    test('should have the correct title, description and canonical URL', async ({ page }) => {
      await page.goto(PAGE_URL);

      const description = CATEGORY_DESCRIPTION_SAMPLES['deforestation'];
      await expect(page).toHaveTitle(categoryPage('deforestation').title);
      await expect(page).toHaveTitle(
        'Forest Area & Tree Cover Loss by Country | eco-metrics earth',
      );
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        description,
      );
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
        'content',
        description,
      );
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        'content',
        CATEGORY_METADATA_TITLES['deforestation'],
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        /\/deforestation\/$/,
      );
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    });

    test('should not overflow horizontally', { tag: '@smoke' }, async ({ page }) => {
      await page.goto(PAGE_URL);
      await showExplorerChart(page);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test('should log no console errors while the charts mount and the theme changes', async ({
      page,
    }) => {
      const errors = collectErrors(page);
      await page.goto(PAGE_URL);
      await showExplorerChart(page);
      await showMap(page);
      await showCauseChart(page);

      await page.getByRole('button', { name: 'Toggle light/dark mode' }).click();

      expect(errors).toEqual([]);
    });
  });

  test.describe('Narrow viewport (360 px)', () => {
    test.use({ viewport: { width: 360, height: 780 }, hasTouch: true });

    test(
      'should not overflow, keep the controls at least 44 px tall and fit the ranking',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        await showExplorerChart(page);
        await showMap(page);
        await openRanking(page);
        await showCauseChart(page);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
        const rankingOverflow = await ranking(page).evaluate(
          (el) => el.scrollWidth - el.clientWidth,
        );
        expect(rankingOverflow).toBeLessThanOrEqual(0);

        const boxes = [
          await country(explorer(page)).boundingBox(),
          await explorer(page).getByText('% of land', { exact: true }).boundingBox(),
          await explorer(page).locator('details summary').boundingBox(),
          await changeCard(page).locator('details summary').boundingBox(),
          await country(causeCard(page)).boundingBox(),
        ];
        for (const box of boxes) {
          expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
        }
      },
    );
  });

  test.describe('Forest area explorer', () => {
    test(
      'should open on World in hectares and switch to the share of land by click and arrow keys',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        await showExplorerChart(page);
        const hectares = explorer(page).getByRole('radio', { name: 'Hectares' });
        const share = explorer(page).getByRole('radio', { name: '% of land' });

        await expect(country(explorer(page))).toHaveValue('World');
        await expect(hectares).toBeChecked();
        await expect(
          explorer(page).getByRole('heading', {
            level: 3,
            name: 'World: forest area (million hectares)',
          }),
        ).toBeVisible();

        await explorer(page).getByText('% of land', { exact: true }).click();
        await expect(share).toBeChecked();
        await expect(
          explorer(page).getByRole('heading', {
            level: 3,
            name: 'World: forest area as a share of land (% of land area)',
          }),
        ).toBeVisible();

        await share.focus();
        await share.press('ArrowLeft');
        await expect(hectares).toBeChecked();
        await hectares.press('ArrowRight');
        await expect(share).toBeChecked();
      },
    );

    test('should state the caveats in the subtitle', async ({ page }) => {
      await page.goto(PAGE_URL);

      const text = await explorer(page).innerText();
      expect(text).toContain('plantations included');
      expect(text).toContain('the years in between are interpolated');
      expect(text).toContain('The vertical axis does not start at zero');
    });

    test('should make the table follow the measure toggle', { tag: '@smoke' }, async ({ page }) => {
      await page.goto(PAGE_URL);
      await explorer(page).getByText('View data table').click();
      const table = explorer(page).getByRole('table');

      await expect(table).toContainText('World: forest area, 1990–2025');
      await expect(
        table.getByRole('columnheader', { name: /Forest area \(thousand hectares\)/ }),
      ).toBeVisible();
      const firstRow = table.locator('tbody tr').first();
      await expect(firstRow.locator('th')).toHaveText('2025');
      await expect(firstRow.locator('td')).toHaveText('4,140,215');

      await explorer(page).getByText('% of land', { exact: true }).click();

      await expect(
        table.getByRole('columnheader', { name: /Forest area \(% of land area\)/ }),
      ).toBeVisible();
      await expect(table.locator('tbody tr').first().locator('td')).toHaveText('31.9');
    });

    test(
      'should show a country with no forest in thousand hectares, with its flag',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);

        await selectCountry(explorer(page), 'nau', 'Nauru');

        await expect(
          explorer(page).getByRole('heading', {
            level: 3,
            name: 'Nauru: forest area (thousand hectares)',
          }),
        ).toBeVisible();
        await expect(explorer(page).locator('.fi-nr')).toBeVisible();
        await expect(
          page.getByRole('status').filter({ hasText: 'Showing forest area' }),
        ).toHaveText('Showing forest area (thousand hectares) for Nauru');
      },
    );

    test(
      'should not change the URL when the selection or the measure changes',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);

        await selectCountry(explorer(page), 'bra', 'Brazil');
        await explorer(page).getByText('% of land', { exact: true }).click();

        expect(new URL(page.url()).pathname).toBe(PAGE_URL);
        expect(new URL(page.url()).search).toBe('');
      },
    );
  });

  test.describe('Change map', () => {
    test(
      'should draw the map below the explorer with its legend and the ranking collapsed',
      { tag: '@smoke' },
      async ({ page }) => {
        const errors = collectErrors(page);
        await page.goto(PAGE_URL);
        await showMap(page);

        const legend = changeCard(page).getByRole('list', {
          name: 'Legend: percentage change in forest area since 1990',
        });
        await expect(legend.getByRole('listitem')).toHaveText([
          `< ${MINUS}50%`,
          `${MINUS}50 to ${MINUS}25%`,
          `${MINUS}25 to ${MINUS}5%`,
          `${MINUS}5 to +5%`,
          '+5 to +25%',
          '+25 to +50%',
          '\u2265 +50%',
          'No data',
        ]);
        await expect(ranking(page)).toBeHidden();

        const mapBox = await changeCard(page).boundingBox();
        const explorerBox = await explorer(page).boundingBox();
        expect(mapBox?.y ?? 0).toBeGreaterThan(explorerBox?.y ?? Infinity);
        expect(errors).toEqual([]);
      },
    );

    test(
      'should give the map box the map aspect ratio with no horizontal overflow',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        await showMap(page);

        const box = await changeCard(page).getByTestId('echart').boundingBox();
        expect(box).not.toBeNull();
        // The map's own aspect ratio (2238 / 1000), so ECharts does not stretch the countries.
        expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(2.238, 1);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      },
    );

    test('should offer no year slider: it is a single comparison', async ({ page }) => {
      await page.goto(PAGE_URL);
      await showMap(page);

      await expect(changeCard(page).getByRole('slider')).toHaveCount(0);
    });
  });

  test.describe('Ranking', () => {
    test(
      'should rank by net change, largest loss first, and mark the sorted column',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        await openRanking(page);

        const netChange = sortButton(page, /^Net change/);
        await expect(sortHeader(netChange)).toHaveAttribute('aria-sort', 'ascending');
        const first = rankingRows(page).first();
        await expect(first.locator('th')).toHaveText('Brazil');
        await expect(first.locator('td').nth(0)).toHaveText('1');
        await expect(first.locator('td').nth(1)).toHaveText(`${MINUS}132,357`);
        await expect(first.locator('td').nth(2)).toHaveText(`${MINUS}21.4%`);
        await expect(rankingRows(page).nth(1).locator('th')).toHaveText(
          'Democratic Republic of Congo',
        );
        await expect(ranking(page).getByRole('table')).toContainText(
          'Countries ranked by net change in forest area, 1990 to 2025',
        );
      },
    );

    test('should list the countries of the fixtures and no aggregate', async ({ page }) => {
      await page.goto(PAGE_URL);
      await openRanking(page);

      const names = await rankingRows(page).locator('th').allInnerTexts();
      expect(names).toHaveLength(19);
      for (const name of ['Sudan', 'South Sudan', 'Russia', 'China', 'Argentina', 'Nauru']) {
        expect(names).toContain(name);
      }
      expect(names).not.toContain('World');
    });

    test(
      'should sort by percentage ranking only countries with 1 million hectares in 1990',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        await openRanking(page);

        const change = sortButton(page, /^Change/);
        await change.click();

        await expect(sortHeader(change)).toHaveAttribute('aria-sort', 'ascending');
        await expect(sortHeader(sortButton(page, /^Net change/))).not.toHaveAttribute('aria-sort');
        await expect(ranking(page).getByRole('table')).toContainText(
          'Countries ranked by percentage change in forest area, 1990 to 2025',
        );
        const first = rankingRows(page).first();
        await expect(first.locator('th')).toHaveText('Burkina Faso');
        await expect(first.locator('td').nth(2)).toHaveText(`${MINUS}61.0%`);

        // Below the threshold: listed after the ranked rows, by name, without a rank.
        const rows = await rankingRows(page).all();
        const tail = rows.slice(-4);
        const tailNames = await Promise.all(tail.map((row) => row.locator('th').innerText()));
        expect(tailNames).toEqual(['Ireland', 'Luxembourg', 'Nauru', 'Uruguay']);
        for (const row of tail) {
          await expect(row.locator('td').nth(0)).toHaveText('\u2014');
        }
        await expect(rankingRows(page).nth(14).locator('td').nth(0)).toHaveText('15');
      },
    );

    test(
      'should keep the unranked countries last when the percentage sort is reversed',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        await openRanking(page);
        const change = sortButton(page, /^Change/);

        await change.click();
        await change.click();

        await expect(sortHeader(change)).toHaveAttribute('aria-sort', 'descending');
        await expect(rankingRows(page).first().locator('th')).toHaveText('China');
        await expect(rankingRows(page).first().locator('td').nth(2)).toHaveText('+44.6%');
        const tail = await rankingRows(page).locator('th').allInnerTexts();
        expect(tail.slice(-4)).toEqual(['Ireland', 'Luxembourg', 'Nauru', 'Uruguay']);
      },
    );

    test('should show a dash, not a percentage, for a country with no forest in 1990', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);
      await openRanking(page);

      const nauru = rankingRows(page).filter({ has: page.getByRole('button', { name: 'Nauru' }) });

      await expect(nauru.locator('td').nth(1)).toHaveText('0');
      await expect(nauru.locator('td').nth(2)).toHaveText('\u2014');
    });

    test('should explain the threshold under the table, with the number of unranked countries', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);
      await openRanking(page);

      await expect(page.getByTestId('forest-ranking-note')).toHaveText(
        'Percentage change is ranked only for countries with at least 1 million hectares of forest in 1990 (4 countries are listed after the ranked ones).',
      );
    });

    test(
      'should outline the country selected in the table on the map',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        await showMap(page);
        const outlined = () => mapSvg(page).locator('path[stroke-width="1.5"]').count();
        expect(await outlined()).toBe(0);
        await openRanking(page);

        const brazil = ranking(page).getByRole('button', { name: 'Brazil' });
        await brazil.click();

        await expect(brazil).toHaveAttribute('aria-pressed', 'true');
        await expect(brazil.locator('xpath=ancestor::tr')).toHaveAttribute('aria-current', 'true');
        await expect.poll(outlined).toBeGreaterThan(0);

        await brazil.click();
        await expect(brazil).toHaveAttribute('aria-pressed', 'false');
        await expect.poll(outlined).toBe(0);
      },
    );

    test(
      'should reach the sort buttons and the country buttons with the keyboard',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        await openRanking(page);
        const change = sortButton(page, /^Change/);

        await change.focus();
        await page.keyboard.press('Enter');

        await expect(sortHeader(change)).toHaveAttribute('aria-sort', 'ascending');
        await page.keyboard.press('Tab');
        await expect(rankingRows(page).first().getByRole('button')).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(rankingRows(page).first().getByRole('button')).toHaveAttribute(
          'aria-pressed',
          'true',
        );
      },
    );
  });

  test.describe('Keyboard order', () => {
    test(
      'should reach the explorer controls, its tables and the cause country in document order',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        await showExplorerChart(page);

        await country(explorer(page)).focus();
        await expect(country(explorer(page))).toBeFocused();
        await tabUntil(page, explorer(page).getByRole('radio', { name: 'Hectares' }));
        await tabUntil(page, explorer(page).locator('details summary').first());
        await tabUntil(page, country(causeCard(page)));
      },
    );
  });

  test.describe('Tree cover loss by cause', () => {
    test(
      'should render the chart for World once the section scrolls into view',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);

        await expect(causeCard(page).getByTestId('chart-skeleton')).toHaveCount(1);
        await expect(causeCard(page).getByTestId('echart')).toHaveCount(0);

        await showCauseChart(page);

        await expect(
          causeCard(page).getByRole('heading', {
            level: 3,
            name: 'World: tree cover loss by cause (million hectares per year)',
          }),
        ).toBeVisible();
        await expect(country(causeCard(page))).toHaveValue('World');
      },
    );

    test('should say it is not deforestation and that the split is approximate', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);

      const text = await causeCard(page).innerText();
      expect(text).toContain('It is not the same as deforestation');
      expect(text).toContain('so the split is approximate');
      await expect(page.getByTestId('tree-cover-loss-note')).toContainText(
        'Detection methods improved between 2011 and 2015',
      );
    });

    test(
      'should change the cause chart without changing the forest area explorer',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        await showCauseChart(page);

        await selectCountry(causeCard(page), 'rus', 'Russia');

        await expect(
          causeCard(page).getByRole('heading', {
            level: 3,
            name: 'Russia: tree cover loss by cause (million hectares per year)',
          }),
        ).toBeVisible();
        await expect(country(explorer(page))).toHaveValue('World');
        await expect(causeCard(page).locator('.fi-ru')).toBeVisible();
      },
    );

    test('should list one column per cause and a total, with a dash for a blank cause and not a zero', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);
      await selectCountry(causeCard(page), 'irel', 'Ireland');
      await causeCard(page).getByText('View data table').click();
      const table = causeCard(page).getByRole('table');

      await expect(table).toContainText(
        'Ireland: tree cover loss by cause, 2001–2024, in thousand hectares',
      );
      const headers = await table.getByRole('columnheader').allInnerTexts();
      expect(headers.map((header) => header.replace(/\s+/g, ' ').trim())).toEqual([
        'Year',
        'Permanent agriculture',
        'Hard commodities (mining and energy)',
        'Settlements and infrastructure',
        'Shifting cultivation',
        'Logging',
        'Wildfire',
        'Other natural disturbances',
        'Total',
      ]);
      // 2024: no hard commodities, other disturbances or shifting cultivation value in the source.
      const latest = table.locator('tbody tr').first();
      await expect(latest.locator('th')).toHaveText('2024');
      const cells = await latest.locator('td').allInnerTexts();
      expect(cells[1]).toBe('\u2014');
      expect(cells[3]).toBe('\u2014');
      expect(cells[0]).not.toBe('\u2014');
      await expect(page.getByTestId('tree-cover-loss-table-note')).toHaveText(
        'A dash means the source lists no loss for that cause.',
      );
    });

    test('should total the World causes in the latest year', async ({ page }) => {
      await page.goto(PAGE_URL);
      await causeCard(page).getByText('View data table').click();
      const latest = causeCard(page).getByRole('table').locator('tbody tr').first();

      await expect(latest.locator('th')).toHaveText('2024');
      // Wildfire is the largest driver in 2024 (13.9 million ha); the total is 29.6 million ha.
      const cells = await latest.locator('td').allInnerTexts();
      expect(cells[5]).toBe('13,877');
      expect(cells[7]).toBe('29,560');
    });
  });

  test.describe('Methodology and attribution', () => {
    test('should state what each source measures and that they are not combined', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);

      const note = page.getByTestId('deforestation-methodology');
      await expect(note).toContainText('FAO Global Forest Resources Assessment 2025');
      await expect(note).toContainText('Global Forest Watch');
      await expect(note).toContainText('they cannot be compared or added together');
      await expect(note).toContainText('Forest includes plantations');
    });

    test('should credit FAO next to the forest area and WRI with Google DeepMind next to the loss', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);

      const forest = page.getByTestId('forest-area-attribution');
      await expect(forest).toContainText('Data:');
      await expect(forest.getByRole('link', { name: 'Our World in Data' })).toHaveAttribute(
        'href',
        'https://ourworldindata.org',
      );
      const fao = page.getByTestId('forest-area-origin');
      await expect(fao).toContainText('Food and Agriculture Organization of the United Nations');
      await expect(fao).toContainText('Global Forest Resources Assessment 2025');
      await expect(fao.getByRole('link', { name: 'CC BY 4.0' })).toBeVisible();

      const loss = page.getByTestId('tree-cover-loss-attribution');
      await expect(loss).toContainText('Data:');
      const gfw = page.getByTestId('tree-cover-loss-origin');
      await expect(gfw).toContainText('Global Forest Watch');
      await expect(gfw).toContainText('Tree cover loss by dominant driver');
      await expect(gfw.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
        'href',
        'https://creativecommons.org/licenses/by/4.0/',
      );
      await expect(forest.getByRole('link', { name: 'All data sources' })).toHaveAttribute(
        'href',
        '/data-sources/',
      );
    });
  });

  test.describe('API', () => {
    test('should serve the forest area payload from the fixtures', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/deforestation/forest-area`, {
        headers: apiHeaders(),
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.meta.stale).not.toBe(true);
      expect(body.data.startYear).toBe(1990);
      expect(body.data.endYear).toBe(2025);
      expect(body.data.entities[0].code).toBe('OWID_WRL');
      expect(body.data.entities[0].area[0]).toBe(4343532500);
    });

    test('should serve the tree cover loss payload with the drivers in stacking order', async ({
      request,
    }) => {
      const response = await request.get(`${API_BASE_URL}/deforestation/tree-cover-loss`, {
        headers: apiHeaders(),
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data.startYear).toBe(2001);
      expect(body.data.endYear).toBe(2024);
      expect(body.data.drivers.map((driver: { id: string }) => driver.id)).toEqual([
        'permanentAgriculture',
        'hardCommodities',
        'settlementsInfrastructure',
        'shiftingCultivation',
        'logging',
        'wildfire',
        'otherNaturalDisturbances',
      ]);
    });
  });
});
