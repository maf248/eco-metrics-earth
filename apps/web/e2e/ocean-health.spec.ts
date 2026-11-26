import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  CATEGORY_DESCRIPTION_SAMPLES,
  CATEGORY_METADATA_TITLES,
  categoryPage,
} from './utils/pages';

const PAGE_URL = '/ocean-health/';

/**
 * The Copernicus fixture ends on 30 Jun 2025 (20.720 °C, anomaly +0.368) and its highest value is
 * 21.091 °C, reached on 1 and on 20 Mar 2024 (a tie names the most recent date), so the record is not in
 * the latest year. The other figures come from the OWID and NOAA fixtures: World anomaly +1.10 °C in
 * 2025 (warmest 2024, +1.21 °C), sea level from −19.33 mm (Dec 1992) to 83.6 mm (Feb 2025), and a
 * yearly pH of 8.109 (1989) and 8.042 (2024), 17% more hydrogen ions.
 */
const FIGURES = {
  'ocean-key-figure-sst': [
    /20\.72\s°C/,
    /\+0\.37\s°C vs the 1991–2020 average, ocean between 60°S–60°N, on 30 Jun 2025/,
    /Daily record since 2022: 21\.09\s°C on 20 Mar 2024/,
  ],
  'ocean-key-figure-warming': [/\+1\.10\s°C/, /in 2025/, /Warmest year: 2024 \(\+1\.21\s°C\)/],
  'ocean-key-figure-sea-level': [/\+10\scm/, /Dec 1992 to Feb 2025/, /Trend: 3\.11\smm\/year/],
  'ocean-key-figure-acidity': [/\+17%/, /More acidic at Hawaii, 1989–2024/],
} as const;

/** Every headline figure and its text, in the server-rendered panel. */
async function expectKeyFigures(page: Page): Promise<void> {
  for (const [testId, texts] of Object.entries(FIGURES)) {
    for (const text of texts) {
      await expect(page.getByTestId(testId)).toContainText(text);
    }
  }
}

const SECTIONS = [
  'Daily sea surface temperature since 2022',
  'Annual sea surface temperature anomaly',
  'Ocean heat content',
  'Global mean sea level',
  'Ocean pH at Hawaii',
] as const;

/** A section is the region its own `<h2>` names. */
const section = (page: Page, name: (typeof SECTIONS)[number]) =>
  page.getByRole('region', { name, exact: true });

const chart = (scope: Locator) => scope.getByTestId('echart').locator('svg').first();

/** Collects console errors and uncaught page errors for the lifetime of the page. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Scrolls a section into view and waits for its lazily mounted chart. */
async function chartOf(page: Page, name: (typeof SECTIONS)[number]): Promise<Locator> {
  const scope = section(page, name);
  await scope.scrollIntoViewIfNeeded();
  await expect(chart(scope)).toBeVisible();
  return scope;
}

test.describe('Ocean Health page', () => {
  test.describe('Core render', () => {
    test(
      'should render the heading, the key figures and the five sections with their charts',
      { tag: '@smoke' },
      async ({ page }) => {
        const response = await page.goto(PAGE_URL);
        expect(response?.status()).toBe(200);

        await expect(page.getByRole('heading', { name: 'Ocean Health', level: 1 })).toBeVisible();
        await expectKeyFigures(page);
        // The first chart is drawn without scrolling.
        await expect(chart(section(page, SECTIONS[0]))).toBeVisible();

        for (const name of SECTIONS) {
          await expect(section(page, name).getByRole('heading', { level: 2, name })).toBeVisible();
          await chartOf(page, name);
        }
      },
    );

    test('should show neither the stale notice nor the unavailable state while the providers are healthy', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);

      await expect(chart(section(page, SECTIONS[0]))).toBeVisible();
      await expect(page.getByTestId('stale-data-notice')).toHaveCount(0);
      await expect(page.getByTestId('data-unavailable')).toHaveCount(0);
    });

    test('should render the lazy charts only after they scroll into view', async ({ page }) => {
      await page.goto(PAGE_URL);
      const pH = section(page, 'Ocean pH at Hawaii');

      await expect(pH.getByTestId('chart-skeleton')).toHaveCount(1);
      await expect(pH.getByTestId('echart')).toHaveCount(0);

      await pH.scrollIntoViewIfNeeded();

      await expect(chart(pH)).toBeVisible();
    });

    test('should log no console errors while the charts mount and the theme changes', async ({
      page,
    }) => {
      const errors = collectErrors(page);
      await page.goto(PAGE_URL);
      for (const name of SECTIONS) {
        await chartOf(page, name);
      }

      await page.getByRole('button', { name: 'Toggle light/dark mode' }).click();

      expect(errors).toEqual([]);
    });

    test('should draw the daily overlay with a legend of the highlighted years and the average', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);
      const daily = section(page, SECTIONS[0]);

      await expect(chart(daily)).toBeVisible();
      await expect(daily.locator('svg text', { hasText: '2025 (current year)' })).toBeVisible();
      await expect(daily.locator('svg text', { hasText: '2024 (record year)' })).toBeVisible();
      await expect(daily.locator('svg text', { hasText: '1991–2020 average' })).toBeVisible();
      await expect(daily.getByTestId('ocean-sst-daily-key')).toContainText(
        'Each grey line is one earlier year since 2022.',
      );
    });

    test.describe('without JavaScript', () => {
      test.use({ javaScriptEnabled: false });

      test('should include the key figures, every heading and the default tables in the HTML', async ({
        page,
      }) => {
        const response = await page.goto(PAGE_URL);
        expect(response?.ok()).toBe(true);

        await expectKeyFigures(page);
        for (const name of SECTIONS) {
          await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
        }
        await expect(page.getByText('View data table')).toHaveCount(5);
        await expect(page.getByRole('table', { includeHidden: true })).toHaveCount(5);
      });

      test('should keep the section headings in reading order and the main landmark before the footer', async ({
        page,
      }) => {
        await page.goto(PAGE_URL);

        expect(await page.locator('main h2').allTextContents()).toEqual([...SECTIONS]);
        const mainBeforeFooter = await page.evaluate(() => {
          const main = document.querySelector('main');
          const footer = document.querySelector('footer');
          return Boolean(
            main &&
            footer &&
            main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING,
          );
        });
        expect(mainBeforeFooter).toBe(true);
      });
    });
  });

  test.describe('Toggles', () => {
    test(
      'should switch the annual anomaly to the Southern Hemisphere without changing the URL',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        const anomaly = await chartOf(page, 'Annual sea surface temperature anomaly');
        await expect(anomaly.getByRole('radio', { name: 'World' })).toBeChecked();

        await anomaly.getByText('Southern Hemisphere').click();

        await expect(
          anomaly.getByRole('heading', {
            level: 3,
            name: 'Southern Hemisphere: annual sea surface temperature anomaly (°C, relative to the 1861–1890 average)',
          }),
        ).toBeVisible();
        await expect(
          anomaly.getByRole('status').filter({ hasText: 'Showing the annual' }),
        ).toHaveText('Showing the annual sea surface temperature anomaly for Southern Hemisphere');
        await anomaly.getByText('View data table').click();
        await expect(
          anomaly.getByRole('table', { name: /^Southern Hemisphere: annual sea surface/ }),
        ).toBeVisible();
        expect(new URL(page.url()).pathname).toBe(PAGE_URL);
        expect(new URL(page.url()).search).toBe('');
      },
    );

    test(
      'should switch ocean heat content from four sources at 0–700 m to three at 0–2000 m',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        const heat = await chartOf(page, 'Ocean heat content');
        const legend = heat.locator('svg text');
        for (const source of ['IAP', 'NOAA', 'MRI/JMA', 'CSIRO']) {
          await expect(legend.filter({ hasText: new RegExp(`^${source}$`) })).toHaveCount(1);
        }

        await heat.getByText('0–2000 m').click();

        await expect(
          heat.getByRole('heading', { level: 3, name: /ocean heat content, 0–2000 m/ }),
        ).toBeVisible();
        await expect(legend.filter({ hasText: /^CSIRO$/ })).toHaveCount(0);
        await expect(legend.filter({ hasText: /^IAP$/ })).toHaveCount(1);
        await heat.getByText('View data table').click();
        const headers = heat.getByRole('columnheader');
        await expect(headers).toHaveCount(4);
        await expect(headers.nth(1)).toContainText('IAP, ');
      },
    );

    test('should make no network request when a toggle changes', async ({ page }) => {
      await page.goto(PAGE_URL);
      const anomaly = await chartOf(page, 'Annual sea surface temperature anomaly');
      const heat = await chartOf(page, 'Ocean heat content');
      const requests: string[] = [];
      page.on('request', (request) => requests.push(request.url()));

      await anomaly.getByText('Northern Hemisphere').click();
      await heat.getByText('0–2000 m').click();
      await expect(heat.getByRole('heading', { level: 3, name: /0–2000 m/ })).toBeVisible();

      expect(requests.filter((url) => !url.startsWith('data:'))).toEqual([]);
    });
  });

  test.describe('Sea level', () => {
    test('should show the trend, the verbatim NOAA acknowledgment and the end of the data', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);
      const seaLevel = section(page, 'Global mean sea level');

      await expect(seaLevel.getByTestId('ocean-sea-level-trend')).toContainText(
        '3.11 mm/year (no glacial isostatic adjustment correction)',
      );
      await expect(seaLevel.getByTestId('ocean-sea-level-rise')).toContainText(
        /from the first measurement \(17 Dec 1992\) to the latest \(16 Feb 2025\), the global mean sea level rose 103\smm, about 10\scm, in 32 years\./i,
      );
      const origin = seaLevel.getByTestId('ocean-sea-level-origin');
      await expect(origin).toContainText(
        'Altimetry data are provided by NOAA Laboratory for Satellite Altimetry.',
      );
      await expect(origin).toContainText('experimental use only');
      const note = seaLevel.getByTestId('ocean-sea-level-end-note');
      await expect(note).toContainText('end in February 2025');
      await expect(note).toContainText('not current');
    });

    test('should draw one line per mission that has values', async ({ page }) => {
      await page.goto(PAGE_URL);
      const seaLevel = await chartOf(page, 'Global mean sea level');
      const legend = seaLevel.locator('svg text');

      for (const mission of ['TOPEX/Poseidon', 'Jason-3', 'Sentinel-6MF']) {
        await expect(legend.filter({ hasText: new RegExp(`^${mission}$`) })).toHaveCount(1);
      }
      // Jason-1 and Jason-2 have no values in the fixture, so they are dropped.
      await expect(legend.filter({ hasText: /^Jason-[12]$/ })).toHaveCount(0);
    });
  });

  test.describe('Data tables', () => {
    test('should give every chart a collapsed table, with distinct accessible names', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);

      await expect(page.getByText('View data table')).toHaveCount(5);
      const names = await page
        .getByRole('region', { name: /^Data table for .*, scrollable$/, includeHidden: true })
        .evaluateAll((regions) => regions.map((region) => region.getAttribute('aria-label')));
      expect(new Set(names).size).toBe(5);
      for (const details of await page.locator('details').all()) {
        await expect(details).not.toHaveAttribute('open', '');
      }
    });

    test('should open the five tables, newest first, with an em dash for missing values', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);
      for (const name of SECTIONS) {
        await section(page, name).getByText('View data table').click();
      }

      const daily = section(page, SECTIONS[0]);
      await expect(daily.getByText('Showing the most recent 90 days')).toBeVisible();
      const dailyRows = daily.getByRole('table').locator('tbody tr');
      await expect(dailyRows).toHaveCount(90);
      await expect(dailyRows.first().locator('th')).toHaveText('2025-06-30');
      await expect(dailyRows.first()).toContainText('20.72');
      await expect(dailyRows.first()).toContainText('Final');

      const anomalyRows = section(page, SECTIONS[1]).getByRole('table').locator('tbody tr');
      await expect(anomalyRows.first().locator('th')).toHaveText('2025');
      await expect(anomalyRows.first()).toContainText('+1.10');

      const heatRows = section(page, SECTIONS[2]).getByRole('table').locator('tbody tr');
      await expect(heatRows.first().locator('th')).toHaveText('2025');
      // The CSIRO series ended years before: an em dash, never a zero.
      await expect(heatRows.first()).toContainText('—');

      const seaLevel = section(page, SECTIONS[3]);
      // One row per year, one column per mission with values: the yearly average.
      await expect(seaLevel.getByRole('columnheader', { name: /Sentinel-6MF/ })).toBeVisible();
      const seaLevelRows = seaLevel.getByRole('table').locator('tbody tr');
      await expect(seaLevelRows.first().locator('th')).toHaveText('2025');
      await expect(seaLevelRows.last().locator('th')).toHaveText('1992');
      // TOPEX/Poseidon ended long before 2025: an em dash, never a zero.
      await expect(seaLevelRows.first()).toContainText('—');

      const phRows = section(page, SECTIONS[4]).getByRole('table').locator('tbody tr');
      await expect(phRows.first().locator('th')).toHaveText('2024-12-20');
      await expect(phRows.last()).toContainText('—');
    });
  });

  test.describe('Attribution', () => {
    test('should credit every provider and producer next to its chart, with links', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);
      const link = (scope: Locator, name: string | RegExp) =>
        scope.getByRole('link', { name }).first();

      const daily = page.getByTestId('ocean-sst-daily-attribution');
      await expect(link(daily, 'Copernicus Climate Pulse')).toHaveAttribute(
        'href',
        'https://pulse.climate.copernicus.eu',
      );
      const copernicus = page.getByTestId('ocean-sst-daily-origin');
      await expect(copernicus).toContainText('Copernicus Climate Change Service (C3S) / ECMWF');
      await expect(copernicus).toContainText('Contains modified Copernicus');
      await expect(copernicus).toContainText('Neither the European Commission nor ECMWF');

      const anomaly = page.getByTestId('ocean-sst-anomaly-attribution');
      await expect(link(anomaly, 'Our World in Data')).toHaveAttribute(
        'href',
        'https://ourworldindata.org',
      );
      await expect(page.getByTestId('ocean-sst-anomaly-origin')).toContainText(
        'Met Office Hadley Centre',
      );
      await expect(
        link(page.getByTestId('ocean-sst-anomaly-origin'), 'Open Government Licence v3.0'),
      ).toHaveAttribute(
        'href',
        'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
      );

      await expect(page.getByTestId('ocean-heat-origin-0')).toContainText(
        'NOAA National Centers for Environmental Information',
      );
      await expect(page.getByTestId('ocean-heat-origin-1')).toContainText(
        'United States Environmental Protection Agency',
      );
      await expect(section(page, 'Ocean heat content')).toContainText(
        'MRI/JMA (Meteorological Research Institute, Japan Meteorological Agency)',
      );

      await expect(
        link(
          page.getByTestId('ocean-sea-level-attribution'),
          'NOAA Laboratory for Satellite Altimetry',
        ),
      ).toHaveAttribute('href', 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/');

      await expect(page.getByTestId('ocean-ph-origin')).toContainText('Hawaii Ocean Time-series');
      await expect(page.getByTestId('ocean-ph-origin')).toContainText(
        'School of Ocean & Earth Science & Technology',
      );

      for (const testId of [
        'ocean-sst-daily-attribution',
        'ocean-sst-anomaly-attribution',
        'ocean-heat-attribution',
        'ocean-sea-level-attribution',
        'ocean-ph-attribution',
      ]) {
        await expect(
          page.getByTestId(testId).getByRole('link', { name: 'All data sources' }),
        ).toHaveAttribute('href', '/data-sources/');
      }
    });
  });

  test.describe('SEO', () => {
    test('should have a unique title, description, canonical URL and social tags', async ({
      page,
    }) => {
      await page.goto(PAGE_URL);

      const description = CATEGORY_DESCRIPTION_SAMPLES['ocean-health'];
      await expect(page).toHaveTitle(categoryPage('ocean-health').title);
      for (const selector of [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
      ]) {
        await expect(page.locator(selector)).toHaveAttribute('content', description);
      }
      for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
        await expect(page.locator(selector)).toHaveAttribute(
          'content',
          CATEGORY_METADATA_TITLES['ocean-health'],
        );
      }
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        /\/ocean-health\/$/,
      );
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    });

    test('should have one h1 and one h2 per section', async ({ page }) => {
      await page.goto(PAGE_URL);

      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 2 })).toHaveText([...SECTIONS]);
    });

    test('should declare one Dataset whose isBasedOn names every provider and origin', async ({
      request,
    }) => {
      const html = await (await request.get(PAGE_URL)).text();
      const blocks = [
        ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
      ];

      expect(blocks).toHaveLength(1);
      const dataset = JSON.parse(blocks[0][1]);
      expect(dataset['@type']).toBe('Dataset');
      expect(dataset.url).toMatch(/\/ocean-health\/$/);
      expect(dataset.description.length).toBeGreaterThanOrEqual(50);
      expect(dataset.variableMeasured).toHaveLength(5);
      // Sources are CreativeWork: a nested Dataset would be validated as a Dataset item of its own.
      expect(blocks[0][1].match(/"@type":"Dataset"/g)).toHaveLength(1);
      const sources = [dataset.isBasedOn].flat() as {
        '@type': string;
        publisher: { name: string };
      }[];
      expect(sources.every((source) => source['@type'] === 'CreativeWork')).toBe(true);
      expect(sources.map(({ publisher }) => publisher.name)).toEqual(
        expect.arrayContaining([
          'Copernicus Climate Pulse',
          'Copernicus Climate Change Service (C3S) / ECMWF',
          'Our World in Data',
          'Met Office Hadley Centre',
          'NOAA National Centers for Environmental Information',
          'United States Environmental Protection Agency',
          'IAP',
          'MRI/JMA',
          'CSIRO',
          'NOAA Laboratory for Satellite Altimetry',
          'School of Ocean & Earth Science & Technology',
        ]),
      );
    });
  });

  test.describe('Data sources', () => {
    test('should list the two new providers and the OWID origins of this page', async ({
      page,
    }) => {
      await page.goto('/data-sources/');

      const providers = page.getByRole('region', { name: 'Live data providers' });
      await expect(providers.getByRole('link', { name: 'Copernicus Climate Pulse' })).toBeVisible();
      await expect(
        providers.getByRole('link', { name: 'NOAA Laboratory for Satellite Altimetry' }).first(),
      ).toBeVisible();
      await expect(providers).toContainText('Ocean Health');
      for (const [producer, title] of [
        ['Met Office Hadley Centre', 'HadSST'],
        ['NOAA National Centers for Environmental Information', 'Heat Content Basin Time Series'],
        ['School of Ocean & Earth Science & Technology', 'Hawaii Ocean Time-series'],
      ] as const) {
        const origin = providers.getByRole('listitem').filter({ hasText: producer }).last();
        await expect(origin.getByRole('link', { name: new RegExp(title) })).toBeVisible();
      }
    });
  });

  test.describe('Narrow viewport (360 px)', () => {
    test.use({ viewport: { width: 360, height: 780 } });

    test(
      'should not overflow horizontally, with the toggles and table controls at least 44 px tall',
      { tag: '@smoke' },
      async ({ page }) => {
        await page.goto(PAGE_URL);
        for (const name of SECTIONS) {
          await chartOf(page, name);
        }

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);

        for (const locator of [
          section(page, 'Ocean heat content').getByRole('radio').first().locator('xpath=..'),
          section(page, SECTIONS[0]).locator('details summary'),
        ]) {
          const box = await locator.boundingBox();
          expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
        }
      },
    );
  });
});
