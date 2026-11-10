import { expect, test, type Page } from '@playwright/test';

const RSC_DELAY_MS = 1_500;
/** Sample copy can wrap one small line differently from live data. */
const SKELETON_DRIFT_PX = 28;

/** Holds the route payload of every client navigation, as a slow connection would. */
async function delayNavigationPayloads(page: Page): Promise<void> {
  await page.route(
    (url) => url.searchParams.has('_rsc') || url.pathname.includes('.segments/'),
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, RSC_DELAY_MS));
      await route.continue();
    },
  );
}

async function openFromPlaceholder(page: Page): Promise<void> {
  await page.goto('/ocean-health/');
  await expect(page.getByRole('heading', { level: 1, name: 'Ocean Health' })).toBeVisible();
  await delayNavigationPayloads(page);
}

function navLink(page: Page, name: string) {
  return page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name });
}

test.describe('Client navigation between categories', () => {
  test('shows the header and the skeletons immediately, then the page', async ({ page }) => {
    await openFromPlaceholder(page);

    await navLink(page, 'CO2 Emissions').click();

    const pending = page.getByTestId('pending-category');
    await expect(pending.getByRole('heading', { level: 1, name: 'CO2 Emissions' })).toBeVisible({
      timeout: RSC_DELAY_MS / 2,
    });
    await expect(pending.getByTestId('category-data-skeleton')).toBeVisible();
    await expect(pending.getByTestId('chart-skeleton')).toBeVisible();
    await expect(navLink(page, 'CO2 Emissions')).toHaveAttribute('aria-current', 'page');

    await expect(page).toHaveURL(/\/co2-emissions\/$/);
    await expect(pending).toHaveCount(0);
    await expect(page.getByTestId('co2-attribution')).toBeAttached();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('keeps the footer below the viewport during a navigation', async ({ page }) => {
    await openFromPlaceholder(page);
    await navLink(page, 'Global Temperature').click();

    await expect(page.getByTestId('pending-category')).toBeVisible();
    const footer = await page.getByRole('contentinfo').boundingBox();
    const viewport = page.viewportSize();
    expect(footer?.y).toBeGreaterThanOrEqual(viewport?.height ?? Number.POSITIVE_INFINITY);
  });

  test('shows no skeleton on the way to a placeholder category', async ({ page }) => {
    await openFromPlaceholder(page);
    await navLink(page, 'Reforestation').click();

    const pending = page.getByTestId('pending-category');
    await expect(pending.getByRole('heading', { level: 1, name: 'Reforestation' })).toBeVisible();
    await expect(pending.getByText('Reforestation metrics — coming soon.')).toBeVisible();
    await expect(page.getByTestId('category-data-skeleton')).toHaveCount(0);
  });

  test('shows the progress bar only when the navigation is slow', async ({ page }) => {
    await openFromPlaceholder(page);
    await navLink(page, 'Air Quality').click();

    await expect(page.getByTestId('navigation-progress')).toBeVisible();
    await expect(page).toHaveURL(/\/air-quality\/$/);
    await expect(page.getByTestId('navigation-progress')).toHaveCount(0);
  });

  test('shows the header when coming from a page that is not a category', async ({ page }) => {
    await page.goto('/');
    await delayNavigationPayloads(page);

    await navLink(page, 'Water Footprint').click();

    await expect(
      page.getByTestId('pending-category').getByRole('heading', { level: 1 }),
    ).toHaveText('Water Footprint', { timeout: RSC_DELAY_MS / 2 });
  });

  test('keeps one main landmark and working charts after going back', async ({ page }) => {
    await page.goto('/co2-emissions/');
    await expect(page.getByTestId('echart').locator('svg').first()).toBeVisible();

    await navLink(page, 'Ocean Health').click();
    await expect(page).toHaveURL(/\/ocean-health\/$/);
    await expect(page.locator('main')).toHaveCount(1);

    await page.goBack();
    await expect(page).toHaveURL(/\/co2-emissions\/$/);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('[data-testid="echart"] svg:visible').first()).toBeVisible();
  });

  test('replaces the skeletons within the good layout shift threshold', async ({ page }) => {
    await openFromPlaceholder(page);
    await page.evaluate(() => {
      const record = window as unknown as { layoutShift: number };
      record.layoutShift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { value: number }[]) {
          record.layoutShift += entry.value;
        }
      }).observe({ type: 'layout-shift' });
    });

    await navLink(page, 'CO2 Emissions').click();
    await expect(page.getByTestId('co2-attribution')).toBeAttached();
    await expect(page.getByTestId('pending-category')).toHaveCount(0);

    const shift = await page.evaluate(
      () => (window as unknown as { layoutShift: number }).layoutShift,
    );
    expect(shift).toBeLessThan(0.1);
  });

  for (const width of [360, 390, 430, 768, 1024, 1280]) {
    for (const { name, slug, skeleton, content } of [
      {
        name: 'CO2 Emissions',
        slug: 'co2-emissions',
        skeleton: 'chart-skeleton',
        content: 'echart',
      },
      {
        name: 'Global Temperature',
        slug: 'global-temperature',
        skeleton: 'chart-skeleton',
        content: 'echart',
      },
      {
        name: 'Energy Sources',
        slug: 'energy-sources',
        skeleton: 'chart-skeleton',
        content: 'echart',
      },
      {
        name: 'Water Footprint',
        slug: 'water-footprint',
        skeleton: 'product-list-skeleton',
        content: width < 1024 ? 'water-footprint-cards' : 'water-footprint-table',
      },
    ]) {
      test(`lines the skeleton of ${slug} up with the page at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await openFromPlaceholder(page);

        await navLink(page, name).click();
        const expected = await page.getByTestId(skeleton).first().boundingBox();
        await expect(page).toHaveURL(new RegExp(`/${slug}/$`), { timeout: 30_000 });
        await expect(page.getByTestId('pending-category')).toHaveCount(0);
        // A chart arrives with its lazy chunk (and a map with its geometry): allow for a cold dev
        // server under parallel load.
        await expect(page.getByTestId(content).first()).toBeVisible({ timeout: 20_000 });

        const actual = await page.getByTestId(content).first().boundingBox();
        expect(Math.abs((actual?.y ?? 0) - (expected?.y ?? 0))).toBeLessThanOrEqual(
          SKELETON_DRIFT_PX,
        );
      });
    }
  }

  test('gives the fixed navigation its own view transition group', async ({ page }) => {
    await page.goto('/ocean-health/');
    const name = await page
      .getByRole('navigation', { name: 'Main navigation' })
      .evaluate((nav) => getComputedStyle(nav).viewTransitionName);
    expect(name).toBe('site-nav');
  });

  test('crossfades the page when the route arrives', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'The crossfade is progressive enhancement');
    await openFromPlaceholder(page);
    await page.addStyleTag({ content: '::view-transition-group(*){animation-duration:2s}' });

    await navLink(page, 'Air Quality').click();

    await expect
      .poll(() =>
        page.evaluate(() =>
          document
            .getAnimations()
            .some((animation) =>
              (animation.effect as KeyframeEffect | null)?.pseudoElement?.includes(
                'view-transition',
              ),
            ),
        ),
      )
      .toBe(true);
  });

  test('opens the destination at the top when leaving a scrolled page', async ({ page }) => {
    await page.goto('/energy-sources/');
    await expect(page.getByTestId('echart').first()).toBeVisible();
    await delayNavigationPayloads(page);
    await page.evaluate(() => window.scrollTo({ top: 1_000, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await navLink(page, 'CO2 Emissions').click();

    await expect(page.getByTestId('pending-category')).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page).toHaveURL(/\/co2-emissions\/$/, { timeout: 30_000 });
    await expect(page.getByTestId('pending-category')).toHaveCount(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('restores the scroll position with the back and forward buttons', async ({ page }) => {
    const scrollTo = async (top: number) => {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(top);
    };
    await page.goto('/energy-sources/');
    await expect(page.getByTestId('echart').first()).toBeVisible();
    await scrollTo(600);

    await navLink(page, 'Ocean Health').click();
    await expect(page).toHaveURL(/\/ocean-health\/$/, { timeout: 30_000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/energy-sources\/$/, { timeout: 30_000 });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);

    await scrollTo(300);
    await page.goForward();
    await expect(page).toHaveURL(/\/ocean-health\/$/, { timeout: 30_000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/energy-sources\/$/, { timeout: 30_000 });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300);
  });

  test('downloads no full page payload on an idle page', async ({ page }) => {
    const payloads: number[] = [];
    page.on('response', async (response) => {
      if (new URL(response.url()).searchParams.has('_rsc')) {
        payloads.push((await response.body().catch(() => Buffer.alloc(0))).length);
      }
    });

    await page.goto('/ocean-health/', { waitUntil: 'networkidle' });

    expect(payloads.filter((bytes) => bytes > 100_000)).toEqual([]);
  });
});
