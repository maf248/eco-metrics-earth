import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { chartBoxClassName } from '@/components/charts/ChartSkeleton';
import type * as WorldGeometryModule from '@/lib/worldGeometry';

const registerMap = jest.fn();
jest.mock('@/components/charts/EMapChart', () => ({ echarts: { registerMap } }));

const ASSET_PATH = join(__dirname, '../../public/geo/world-countries.json');

interface Feature {
  properties: { key: string; code: string | null; name: string };
}

const asset = JSON.parse(readFileSync(ASSET_PATH, 'utf8')) as {
  type: string;
  aspect: number;
  features: Feature[];
};

/** A fresh module, so each test starts without the memoised promise. */
function loadModule(): typeof WorldGeometryModule {
  let loaded: typeof WorldGeometryModule | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual<typeof WorldGeometryModule>('@/lib/worldGeometry');
  });
  return loaded as typeof WorldGeometryModule;
}

function respond(body: unknown, ok = true, status = 200): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({ ok, status, json: () => Promise.resolve(body) });
  global.fetch = fetchMock;
  return fetchMock;
}

describe('world geometry asset', () => {
  it('should be a feature collection of uniquely keyed regions', () => {
    expect(asset.type).toBe('FeatureCollection');
    expect(asset.features.length).toBeGreaterThan(200);
    const keys = asset.features.map(({ properties }) => properties.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('should key a region by its entity code, or by its name when it has none', () => {
    for (const { properties } of asset.features) {
      expect(properties.key).toBe(properties.code ?? `region:${properties.name}`);
    }
    const codes = asset.features.map(({ properties }) => properties.code);
    expect(codes).toEqual(expect.arrayContaining(['ARG', 'USA', 'OWID_KOS']));
    expect(codes).not.toContain('ATA');
  });

  it('should match the aspect ratio of the map box, which ECharts would otherwise stretch to', () => {
    const [, width, height] = /aspect-\[(\d+)\/(\d+)\]/.exec(chartBoxClassName('map')) ?? [];
    expect(asset.aspect).toBeCloseTo(Number(width) / Number(height), 3);
  });
});

describe('world silhouette (map skeleton mask)', () => {
  const svg = readFileSync(join(__dirname, '../../public/geo/world-silhouette.svg'), 'utf8');

  it('should draw the land outline in the frame of the map, so the skeleton lines up', () => {
    const [, width, height] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg) ?? [];
    expect(Number(width) / Number(height)).toBeCloseTo(asset.aspect, 2);
    expect(svg).toMatch(/<path d="M\d+ \d+l/);
  });

  it('should stay small: it is fetched on every visit that shows a map skeleton', () => {
    expect(svg.length).toBeLessThan(16_000);
  });
});

describe('loadWorldGeometry', () => {
  const originalFetch = global.fetch;

  beforeEach(() => registerMap.mockClear());
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should fetch the asset, register it once and return its regions', async () => {
    const fetchMock = respond(asset);
    const { loadWorldGeometry, WORLD_GEOMETRY_URL, WORLD_MAP_NAME } = loadModule();

    const [first, second] = await Promise.all([loadWorldGeometry(), loadWorldGeometry()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(WORLD_GEOMETRY_URL);
    expect(registerMap).toHaveBeenCalledTimes(1);
    expect(registerMap).toHaveBeenCalledWith(WORLD_MAP_NAME, asset);
    expect(first).toBe(second);
    expect(first).toHaveLength(asset.features.length);
    expect(first[0]).toEqual(asset.features[0].properties);
  });

  it('should reject a failed response and retry on the next call', async () => {
    respond({}, false, 503);
    const { loadWorldGeometry } = loadModule();
    await expect(loadWorldGeometry()).rejects.toThrow('status 503');

    respond(asset);
    await expect(loadWorldGeometry()).resolves.toHaveLength(asset.features.length);
  });

  it('should reject an unexpected payload without registering it', async () => {
    respond({ type: 'Topology' });
    const { loadWorldGeometry } = loadModule();
    await expect(loadWorldGeometry()).rejects.toThrow('unexpected shape');
    expect(registerMap).not.toHaveBeenCalled();
  });

  it('should reject instead of throwing when fetch is unavailable', async () => {
    global.fetch = undefined as unknown as typeof fetch;
    const { loadWorldGeometry } = loadModule();
    await expect(loadWorldGeometry()).rejects.toThrow();
  });
});
