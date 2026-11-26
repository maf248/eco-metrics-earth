import { render, screen, within } from '@testing-library/react';
import { cacheLife } from 'next/cache';

import { ProviderBackedContent, type ProviderPageState } from '@/components/ProviderBackedContent';
import { DEGRADED_REVALIDATE_SECONDS, type ProviderPayloadResult } from '@/lib/bffFetch';
import {
  CATEGORY_PAGES,
  defineCategoryPage,
  defineProviderCategoryPage,
  defineSectionedProviderCategoryPage,
  loadCategoryData,
  resolveProviderPageState,
} from '@/lib/categoryPages';
import { CATEGORY_SKELETONS } from '@/lib/categorySkeletons';
import { getCo2Emissions } from '@/lib/co2Emissions';
import { getEnergySources } from '@/lib/energySources';
import { getGlobalTemperature } from '@/lib/globalTemperature';
import {
  getOceanHeatContent,
  getOceanPh,
  getOceanSeaLevel,
  getOceanSst,
  getOceanSstAnomaly,
} from '@/lib/oceanHealth';
import { getWasteRecycling } from '@/lib/wasteRecycling';
import { getWaterFootprintProducts } from '@/lib/waterFootprint';

import { CO2_FIXTURE, CO2_META } from '../fixtures/co2Emissions';
import { ENERGY_FIXTURE, ENERGY_META } from '../fixtures/energySources';
import { TEMPERATURE_FIXTURE, TEMPERATURE_META } from '../fixtures/globalTemperature';
import {
  COPERNICUS_META,
  NOAA_LSA_META,
  OCEAN_HEAT_FIXTURE,
  OCEAN_PH_FIXTURE,
  OCEAN_SEA_LEVEL_FIXTURE,
  OCEAN_SST_ANOMALY_FIXTURE,
  OCEAN_SST_DAILY_FIXTURE,
  OWID_OCEAN_META,
} from '../fixtures/oceanHealth';
import { WASTE_FIXTURE, WASTE_META } from '../fixtures/wasteRecycling';

jest.mock('@/lib/waterFootprint', () => ({ getWaterFootprintProducts: jest.fn() }));
jest.mock('@/lib/co2Emissions', () => ({ getCo2Emissions: jest.fn() }));
jest.mock('@/lib/globalTemperature', () => ({ getGlobalTemperature: jest.fn() }));
jest.mock('@/lib/energySources', () => ({ getEnergySources: jest.fn() }));
jest.mock('@/lib/oceanHealth', () => ({
  getOceanSst: jest.fn(),
  getOceanSstAnomaly: jest.fn(),
  getOceanHeatContent: jest.fn(),
  getOceanSeaLevel: jest.fn(),
  getOceanPh: jest.fn(),
}));
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
  it('should register exactly the six categories with live data', () => {
    expect(Object.keys(CATEGORY_PAGES).sort()).toEqual([
      'co2-emissions',
      'energy-sources',
      'global-temperature',
      'ocean-health',
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

type SectionStatesOf<S extends Record<string, { meta: typeof TEMPERATURE_META }>> = {
  [K in keyof S]: ProviderPageState<S[K]>;
};

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

describe('CATEGORY_PAGES ocean-health entry', () => {
  const ok = <T,>(data: T, meta: typeof COPERNICUS_META) => ({
    kind: 'ok' as const,
    payload: { data, meta },
  });
  const stale = (meta: typeof OWID_OCEAN_META, days: number) => ({
    ...meta,
    stale: true,
    fetchedAt: daysAgo(days),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: NOW });
    jest.mocked(getOceanSst).mockResolvedValue(ok(OCEAN_SST_DAILY_FIXTURE, COPERNICUS_META));
    jest
      .mocked(getOceanSstAnomaly)
      .mockResolvedValue(ok(OCEAN_SST_ANOMALY_FIXTURE, OWID_OCEAN_META));
    jest.mocked(getOceanHeatContent).mockResolvedValue(ok(OCEAN_HEAT_FIXTURE, OWID_OCEAN_META));
    jest.mocked(getOceanSeaLevel).mockResolvedValue(ok(OCEAN_SEA_LEVEL_FIXTURE, NOAA_LSA_META));
    jest.mocked(getOceanPh).mockResolvedValue(ok(OCEAN_PH_FIXTURE, OWID_OCEAN_META));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function renderOcean() {
    const definition = CATEGORY_PAGES['ocean-health'];
    if (!definition) throw new Error('missing entry');
    const { Content } = definition;
    const states = await definition.load();
    return { definition, states, ...render(<Content data={states} />) };
  }

  it('should render every section inside the centered container, with no degraded state', async () => {
    const { container } = await renderOcean();

    expect(container.firstElementChild).toHaveClass('mt-8', 'w-full', 'flex', 'justify-center');
    expect(within(screen.getByTestId('ocean-key-figures')).getAllByRole('listitem')).toHaveLength(
      4,
    );
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      'Daily sea surface temperature since 2022',
      'Annual sea surface temperature anomaly',
      'Ocean heat content',
      'Global mean sea level',
      'Ocean pH at Hawaii',
    ]);
    expect(screen.queryByTestId('stale-data-notice')).not.toBeInTheDocument();
    expect(screen.queryByTestId('data-unavailable')).not.toBeInTheDocument();
  });

  it('should read the five providers once each', async () => {
    await renderOcean();

    for (const loader of [
      getOceanSst,
      getOceanSstAnomaly,
      getOceanHeatContent,
      getOceanSeaLevel,
      getOceanPh,
    ]) {
      expect(loader).toHaveBeenCalledTimes(1);
    }
  });

  it('should show the unavailable state of one provider only, naming it, and keep the rest', async () => {
    jest.mocked(getOceanSeaLevel).mockResolvedValue({ kind: 'provider-unavailable' });

    const { definition, states } = await renderOcean();

    expect(screen.getByTestId('data-unavailable')).toHaveTextContent(
      'NOAA Laboratory for Satellite Altimetry',
    );
    const seaLevel = screen.getByRole('region', { name: 'Global mean sea level' });
    expect(within(seaLevel).getByTestId('data-unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('ocean-key-figure-sst')).toBeInTheDocument();
    expect(screen.queryByTestId('ocean-key-figure-sea-level')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('ocean-key-figures')).getAllByRole('listitem')).toHaveLength(
      3,
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Ocean pH at Hawaii' }),
    ).toBeInTheDocument();
    expect(definition.isDegraded?.(states)).toBe(true);
    expect(document.querySelector('script[type="application/ld+json"]')?.textContent).not.toContain(
      'NOAA Laboratory for Satellite Altimetry',
    );
  });

  it('should show one unavailable state and no daily chart when Copernicus is down', async () => {
    jest.mocked(getOceanSst).mockResolvedValue({ kind: 'provider-unavailable' });

    await renderOcean();

    expect(screen.getAllByTestId('data-unavailable')).toHaveLength(1);
    expect(screen.getByTestId('data-unavailable')).toHaveTextContent('Copernicus Climate Pulse');
    expect(screen.queryByTestId('ocean-key-figure-sst')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('ocean-key-figures')).getAllByRole('listitem')).toHaveLength(
      3,
    );
    expect(screen.queryByTestId('ocean-sst-daily-attribution')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Ocean heat content' }),
    ).toBeInTheDocument();
  });

  it('should show the stale notice above one section only', async () => {
    jest
      .mocked(getOceanSstAnomaly)
      .mockResolvedValue(ok(OCEAN_SST_ANOMALY_FIXTURE, stale(OWID_OCEAN_META, 14)));

    await renderOcean();

    const notices = screen.getAllByTestId('stale-data-notice');
    expect(notices).toHaveLength(1);
    const anomaly = screen.getByRole('region', { name: 'Annual sea surface temperature anomaly' });
    expect(within(anomaly).getByTestId('stale-data-notice')).toHaveTextContent('Our World in Data');
  });

  it('should show no key figures panel when every provider is unavailable', async () => {
    for (const read of [
      getOceanSst,
      getOceanSstAnomaly,
      getOceanHeatContent,
      getOceanSeaLevel,
      getOceanPh,
    ]) {
      jest.mocked(read).mockResolvedValue({ kind: 'provider-unavailable' });
    }

    await renderOcean();

    expect(screen.getAllByTestId('data-unavailable')).toHaveLength(5);
    expect(screen.queryByTestId('ocean-key-figures')).not.toBeInTheDocument();
  });

  it('should show the notice once above the daily chart for a 3-day-old Copernicus payload', async () => {
    jest
      .mocked(getOceanSst)
      .mockResolvedValue(ok(OCEAN_SST_DAILY_FIXTURE, stale(COPERNICUS_META, 3)));

    const { container } = await renderOcean();

    expect(screen.getAllByTestId('stale-data-notice')).toHaveLength(1);
    const notice = screen.getByTestId('stale-data-notice');
    const figure = screen.getByTestId('ocean-key-figure-sst');
    const daily = screen.getByRole('heading', { level: 2, name: /^Daily sea surface temperature/ });
    // Figures, then the notice, then the daily chart it belongs to.
    expect(figure.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notice.compareDocumentPosition(daily) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container).toBeInTheDocument();
  });

  it('should treat a 3-day-old payload of a default-threshold provider as fresh', async () => {
    jest
      .mocked(getOceanSstAnomaly)
      .mockResolvedValue(ok(OCEAN_SST_ANOMALY_FIXTURE, stale(OWID_OCEAN_META, 3)));

    await renderOcean();

    expect(screen.queryByTestId('stale-data-notice')).not.toBeInTheDocument();
  });

  it('should propagate a failure of our own BFF', async () => {
    jest.mocked(getOceanPh).mockRejectedValue(new Error('BFF down'));
    const definition = CATEGORY_PAGES['ocean-health'];

    await expect(definition?.load()).rejects.toThrow('BFF down');
  });

  it('should not be degraded when every provider answers', async () => {
    const { definition, states } = await renderOcean();

    expect(definition.isDegraded?.(states)).toBe(false);
  });
});

describe('defineSectionedProviderCategoryPage', () => {
  type Payload = { meta: typeof TEMPERATURE_META };
  type Sections = { first: Payload; second: Payload };

  const fresh = (provider: string): Payload => ({
    meta: { ...TEMPERATURE_META, source: { ...TEMPERATURE_META.source, provider } },
  });
  const stale = (days: number): Payload => ({
    meta: { ...TEMPERATURE_META, stale: true, fetchedAt: daysAgo(days) },
  });

  const Content = ({ states }: { states: SectionStatesOf<Sections> }) => (
    <>
      {(['first', 'second'] as const).map((key) => (
        <section key={key} data-testid={`section-${key}`}>
          <ProviderBackedContent
            state={states[key]}
            Content={({ data }) => <p data-testid={`inner-${key}`}>{data.meta.source.provider}</p>}
          />
        </section>
      ))}
    </>
  );

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should resolve a provider outage in one section without failing the others', async () => {
    const definition = defineSectionedProviderCategoryPage<Sections>({
      sections: {
        first: {
          provider: { name: 'First' },
          load: async () => ({ kind: 'ok' as const, payload: fresh('First') }),
        },
        second: {
          provider: { name: 'Second' },
          load: async () => ({ kind: 'provider-unavailable' as const }),
        },
      },
      Content,
    });

    const states = (await definition.load()) as Record<string, { kind: string }>;

    expect(states.first.kind).toBe('fresh');
    expect(states.second).toEqual({ kind: 'unavailable', providerName: 'Second' });
    const { Content: Page } = definition;
    render(<Page data={states} />);
    expect(screen.getByTestId('inner-first')).toBeInTheDocument();
    expect(screen.getByTestId('data-unavailable')).toHaveTextContent('Second');
    expect(screen.queryByTestId('inner-second')).not.toBeInTheDocument();
  });

  it('should apply the freshness override of each section on its own', async () => {
    const definition = defineSectionedProviderCategoryPage<Sections>({
      sections: {
        first: {
          provider: { name: 'First', freshness: { silentDays: 2, noticeDays: 30 } },
          load: async () => ({ kind: 'ok' as const, payload: stale(3) }),
        },
        second: {
          provider: { name: 'Second' },
          load: async () => ({ kind: 'ok' as const, payload: stale(3) }),
        },
      },
      Content,
    });

    const states = (await definition.load()) as Record<string, { kind: string }>;

    expect(states.first.kind).toBe('stale-notice');
    expect(states.second.kind).toBe('fresh');
  });

  it('should be degraded only when a section is unavailable without a payload', async () => {
    const build = (second: ProviderPayloadResult<Payload>) =>
      defineSectionedProviderCategoryPage<Sections>({
        sections: {
          first: {
            provider: { name: 'First' },
            load: async () => ({ kind: 'ok' as const, payload: fresh('First') }),
          },
          second: { provider: { name: 'Second' }, load: async () => second },
        },
        Content,
      });

    const down = build({ kind: 'provider-unavailable' });
    const staleButShown = build({ kind: 'ok', payload: stale(14) });
    const tooOld = build({ kind: 'ok', payload: stale(40) });

    expect(down.isDegraded?.(await down.load())).toBe(true);
    expect(staleButShown.isDegraded?.(await staleButShown.load())).toBe(false);
    // Too old to show but with a payload: the attribution still renders, no short revalidation.
    expect(tooOld.isDegraded?.(await tooOld.load())).toBe(false);
  });

  it('should propagate a failure of our own BFF in any section', async () => {
    const definition = defineSectionedProviderCategoryPage<Sections>({
      sections: {
        first: {
          provider: { name: 'First' },
          load: async () => ({ kind: 'ok' as const, payload: fresh('First') }),
        },
        second: {
          provider: { name: 'Second' },
          load: async () => {
            throw new Error('BFF down');
          },
        },
      },
      Content,
    });

    await expect(definition.load()).rejects.toThrow('BFF down');
  });

  it('should start every section read before any of them resolves', async () => {
    const started: string[] = [];
    const releases: (() => void)[] = [];
    const slow = (key: string, payload: Payload) => () => {
      started.push(key);
      return new Promise<ProviderPayloadResult<Payload>>((resolve) => {
        releases.push(() => resolve({ kind: 'ok', payload }));
      });
    };
    const definition = defineSectionedProviderCategoryPage<Sections>({
      sections: {
        first: { provider: { name: 'First' }, load: slow('first', fresh('First')) },
        second: { provider: { name: 'Second' }, load: slow('second', fresh('Second')) },
      },
      Content,
    });

    const loading = definition.load();
    await Promise.resolve();

    expect(started).toEqual(['first', 'second']);
    releases.forEach((release) => release());
    await expect(loading).resolves.toHaveProperty('second');
  });
});

describe('resolveProviderPageState', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should resolve every state the single-provider helper shows', () => {
    const provider = { name: 'Registry name' };
    const at = (days: number) => ({
      kind: 'ok' as const,
      payload: { meta: { ...TEMPERATURE_META, stale: true, fetchedAt: daysAgo(days) } },
    });

    expect(resolveProviderPageState({ kind: 'provider-unavailable' }, provider)).toEqual({
      kind: 'unavailable',
      providerName: 'Registry name',
    });
    expect(resolveProviderPageState(at(1), provider).kind).toBe('fresh');
    expect(resolveProviderPageState(at(14), provider).kind).toBe('stale-notice');
    expect(resolveProviderPageState(at(40), provider)).toMatchObject({
      kind: 'unavailable',
      providerName: 'Our World in Data',
    });
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
    await expect(loadCategoryData('air-quality')).resolves.toBeUndefined();
  });
});

describe('CATEGORY_SKELETONS', () => {
  it('should declare exactly the categories with live data', () => {
    expect(Object.keys(CATEGORY_SKELETONS).sort()).toEqual(Object.keys(CATEGORY_PAGES).sort());
  });
});
