import { render, screen } from '@testing-library/react';
import { cacheLife } from 'next/cache';

import { DEGRADED_REVALIDATE_SECONDS } from '@/lib/bffFetch';
import {
  CATEGORY_PAGES,
  defineCategoryPage,
  defineProviderCategoryPage,
  loadCategoryData,
} from '@/lib/categoryPages';
import { CATEGORY_SKELETONS } from '@/lib/categorySkeletons';
import { getCo2Emissions } from '@/lib/co2Emissions';
import { getEnergySources } from '@/lib/energySources';
import { getGlobalTemperature } from '@/lib/globalTemperature';
import { getWasteRecycling } from '@/lib/wasteRecycling';
import { getWaterFootprintProducts } from '@/lib/waterFootprint';

import { CO2_FIXTURE, CO2_META } from '../fixtures/co2Emissions';
import { ENERGY_FIXTURE, ENERGY_META } from '../fixtures/energySources';
import { TEMPERATURE_FIXTURE, TEMPERATURE_META } from '../fixtures/globalTemperature';
import { WASTE_FIXTURE, WASTE_META } from '../fixtures/wasteRecycling';

jest.mock('@/lib/waterFootprint', () => ({ getWaterFootprintProducts: jest.fn() }));
jest.mock('@/lib/co2Emissions', () => ({ getCo2Emissions: jest.fn() }));
jest.mock('@/lib/globalTemperature', () => ({ getGlobalTemperature: jest.fn() }));
jest.mock('@/lib/energySources', () => ({ getEnergySources: jest.fn() }));
jest.mock('@/lib/wasteRecycling', () => ({ getWasteRecycling: jest.fn() }));
jest.mock('@/components/charts/LazyBarEChart', () => ({
  LazyBarEChart: () => <div data-testid="bar-stub" />,
}));
jest.mock('@/components/charts/ChoroplethMap', () => ({
  ChoroplethMap: () => <div data-testid="map-stub" />,
}));
jest.mock('@/components/charts/LazyPieEChart', () => ({
  LazyPieEChart: () => <div data-testid="pie-stub" />,
}));
jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: () => <div data-testid="chart-stub" />,
}));

jest.mock('next/cache', () => ({ cacheLife: jest.fn() }));

describe('CATEGORY_PAGES', () => {
  it('should register exactly the five categories with live data', () => {
    expect(Object.keys(CATEGORY_PAGES).sort()).toEqual([
      'co2-emissions',
      'energy-sources',
      'global-temperature',
      'waste-recycling',
      'water-footprint',
    ]);
  });

  it('should give every entry a loader and a content component', () => {
    for (const definition of Object.values(CATEGORY_PAGES)) {
      expect(typeof definition.load).toBe('function');
      expect(typeof definition.Content).toBe('function');
    }
  });

  it('should render waste-recycling content inside the centered container', async () => {
    jest.mocked(getWasteRecycling).mockResolvedValue({ data: WASTE_FIXTURE, meta: WASTE_META });
    const definition = CATEGORY_PAGES['waste-recycling'];
    if (!definition) throw new Error('missing entry');

    const { container } = render(<definition.Content data={await definition.load()} />);

    expect(container.firstElementChild).toHaveClass('mt-8', 'w-full', 'flex', 'justify-center');
    expect(screen.getByTestId('waste-key-figures')).toHaveTextContent('2.33 billion tonnes');
    expect(definition.isDegraded).toBeUndefined();
  });

  it('should render water-footprint content inside the centered container', () => {
    const Content = CATEGORY_PAGES['water-footprint']?.Content;
    if (!Content) throw new Error('missing entry');

    const { container } = render(<Content data={[]} />);

    expect(container.firstElementChild).toHaveClass('mt-8', 'w-full', 'flex', 'justify-center');
    expect(screen.getByText('No water footprint data is currently available.')).toBeInTheDocument();
  });
});

const NOW = new Date('2026-10-28T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const daysAgo = (days: number): string => new Date(NOW.getTime() - days * DAY_MS).toISOString();

/** Runs the entry's `load` and renders its `Content` with the result, like the page does. */
async function renderEntry(slug: 'co2-emissions' | 'global-temperature' | 'energy-sources') {
  const definition = CATEGORY_PAGES[slug];
  if (!definition) throw new Error('missing entry');
  const { Content } = definition;
  return render(<Content data={await definition.load()} />);
}

describe('CATEGORY_PAGES provider-backed entries', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    jest.mocked(getCo2Emissions).mockResolvedValue({
      kind: 'ok',
      payload: { data: CO2_FIXTURE, meta: CO2_META },
    });
    jest.mocked(getGlobalTemperature).mockResolvedValue({
      kind: 'ok',
      payload: { data: TEMPERATURE_FIXTURE, meta: TEMPERATURE_META },
    });
    jest.mocked(getEnergySources).mockResolvedValue({
      kind: 'ok',
      payload: { data: ENERGY_FIXTURE, meta: ENERGY_META },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ['co2-emissions', 'co2-key-figures'],
    ['global-temperature', 'global-temperature-key-figures'],
    ['energy-sources', 'energy-key-figures'],
  ] as const)(
    'should render fresh %s content with no notice and no unavailable state',
    async (slug, testId) => {
      const { container } = await renderEntry(slug);

      expect(container.firstElementChild).toHaveClass('mt-8', 'w-full', 'flex', 'justify-center');
      expect(screen.getByTestId(testId)).toBeInTheDocument();
      expect(screen.queryByTestId('stale-data-notice')).not.toBeInTheDocument();
      expect(screen.queryByTestId('data-unavailable')).not.toBeInTheDocument();
    },
  );

  it('should treat a 6.9-day-old stale payload as fresh', async () => {
    jest.mocked(getGlobalTemperature).mockResolvedValue({
      kind: 'ok',
      payload: {
        data: TEMPERATURE_FIXTURE,
        meta: { ...TEMPERATURE_META, stale: true, fetchedAt: daysAgo(6.9) },
      },
    });

    await renderEntry('global-temperature');

    expect(screen.queryByTestId('stale-data-notice')).not.toBeInTheDocument();
    expect(screen.getByTestId('global-temperature-key-figures')).toBeInTheDocument();
  });

  it('should show the notice above the full content for a 14-day-old stale payload', async () => {
    jest.mocked(getEnergySources).mockResolvedValue({
      kind: 'ok',
      payload: {
        data: ENERGY_FIXTURE,
        meta: { ...ENERGY_META, stale: true, fetchedAt: daysAgo(14) },
      },
    });

    await renderEntry('energy-sources');

    const notice = screen.getByTestId('stale-data-notice');
    const content = screen.getByTestId('energy-key-figures');
    expect(notice).toHaveTextContent(
      'Our World in Data is currently unreachable. Showing the copy we retrieved on Oct 14, 2026.',
    );
    expect(notice.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId('data-unavailable')).not.toBeInTheDocument();
  });

  it('should replace the content with the unavailable state for a 40-day-old stale payload', async () => {
    jest.mocked(getCo2Emissions).mockResolvedValue({
      kind: 'ok',
      payload: { data: CO2_FIXTURE, meta: { ...CO2_META, stale: true, fetchedAt: daysAgo(40) } },
    });

    await renderEntry('co2-emissions');

    expect(screen.getByTestId('data-unavailable')).toHaveTextContent(
      'Last retrieved from Our World in Data: Sep 18, 2026',
    );
    expect(screen.getByTestId('unavailable-data-attribution')).toBeInTheDocument();
    expect(screen.queryByTestId('co2-key-figures')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stale-data-notice')).not.toBeInTheDocument();
  });

  it.each([
    ['co2-emissions', getCo2Emissions],
    ['global-temperature', getGlobalTemperature],
    ['energy-sources', getEnergySources],
  ] as const)(
    'should show %s as unavailable with the registry provider name on a provider 502',
    async (slug, getter) => {
      jest.mocked(getter).mockResolvedValue({ kind: 'provider-unavailable' });

      await renderEntry(slug);

      const unavailable = screen.getByTestId('data-unavailable');
      expect(unavailable).toHaveTextContent("We couldn't reach Our World in Data");
      expect(unavailable).not.toHaveTextContent('Last retrieved from');
      expect(screen.queryByTestId('unavailable-data-attribution')).not.toBeInTheDocument();
    },
  );

  it('should propagate a failure of the BFF itself', async () => {
    jest.mocked(getEnergySources).mockRejectedValue(new Error('unreachable'));

    await expect(CATEGORY_PAGES['energy-sources']?.load()).rejects.toThrow('unreachable');
  });

  it('should leave water-footprint on the plain registration', async () => {
    const definition = CATEGORY_PAGES['water-footprint'];
    jest.mocked(getWaterFootprintProducts).mockResolvedValue([]);

    await expect(definition?.load()).resolves.toEqual([]);
  });
});

describe('defineProviderCategoryPage', () => {
  const Content = ({ data }: { data: { meta: typeof TEMPERATURE_META } }) => (
    <p data-testid="inner">{data.meta.fetchedAt}</p>
  );

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should honor a per-category freshness override', async () => {
    const definition = defineProviderCategoryPage({
      provider: { name: 'Example', freshness: { silentDays: 1, noticeDays: 3 } },
      load: async () => ({
        kind: 'ok' as const,
        payload: { meta: { ...TEMPERATURE_META, stale: true, fetchedAt: daysAgo(2) } },
      }),
      Content,
    });
    const { Content: Page } = definition;

    render(<Page data={await definition.load()} />);

    expect(screen.getByTestId('stale-data-notice')).toBeInTheDocument();
    expect(screen.getByTestId('inner')).toBeInTheDocument();
  });

  it('should use meta.source.provider over the registry name when meta exists', async () => {
    const definition = defineProviderCategoryPage({
      provider: { name: 'Registry name' },
      load: async () => ({
        kind: 'ok' as const,
        payload: { meta: { ...TEMPERATURE_META, stale: true, fetchedAt: daysAgo(14) } },
      }),
      Content,
    });
    const { Content: Page } = definition;

    render(<Page data={await definition.load()} />);

    expect(screen.getByTestId('stale-data-notice')).toHaveTextContent('Our World in Data');
    expect(screen.getByTestId('stale-data-notice')).not.toHaveTextContent('Registry name');
  });

  it('should reject invalid thresholds when loading', async () => {
    const definition = defineProviderCategoryPage({
      provider: { name: 'Example', freshness: { silentDays: 5, noticeDays: 5 } },
      load: async () => ({ kind: 'ok' as const, payload: { meta: TEMPERATURE_META } }),
      Content,
    });

    await expect(definition.load()).rejects.toThrow('Invalid freshness thresholds');
  });
});

describe('defineCategoryPage', () => {
  it('should return the definition it was given', async () => {
    const definition = defineCategoryPage({
      load: async () => 'data',
      Content: ({ data }) => <p>{data}</p>,
    });

    await expect(definition.load()).resolves.toBe('data');
  });
});

describe('loadCategoryData', () => {
  const lastLifetime = () => jest.mocked(cacheLife).mock.lastCall?.[0];

  beforeEach(() => jest.mocked(cacheLife).mockClear());

  it('should keep a healthy read for a day', async () => {
    jest.mocked(getCo2Emissions).mockResolvedValue({
      kind: 'ok',
      payload: { data: CO2_FIXTURE, meta: CO2_META },
    });
    await expect(loadCategoryData('co2-emissions')).resolves.toMatchObject({ kind: 'fresh' });
    expect(lastLifetime()).toMatchObject({ revalidate: 86_400 });
  });

  it('should keep a read with the provider down only for minutes', async () => {
    jest.mocked(getCo2Emissions).mockResolvedValue({ kind: 'provider-unavailable' });
    await expect(loadCategoryData('co2-emissions')).resolves.toMatchObject({ kind: 'unavailable' });
    expect(lastLifetime()).toMatchObject({ revalidate: DEGRADED_REVALIDATE_SECONDS });
  });

  it('should reject on a failed read, so nothing is stored', async () => {
    jest.mocked(getCo2Emissions).mockRejectedValue(new Error('BFF down'));
    await expect(loadCategoryData('co2-emissions')).rejects.toThrow('BFF down');
    expect(cacheLife).not.toHaveBeenCalled();
  });

  it('should resolve to nothing for a category without an entry', async () => {
    await expect(loadCategoryData('ocean-health')).resolves.toBeUndefined();
  });
});

describe('CATEGORY_SKELETONS', () => {
  it('should declare exactly the categories with live data', () => {
    expect(Object.keys(CATEGORY_SKELETONS).sort()).toEqual(Object.keys(CATEGORY_PAGES).sort());
  });
});
