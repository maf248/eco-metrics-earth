import {
  getOceanHeatContent,
  getOceanPh,
  getOceanSeaLevel,
  getOceanSst,
  getOceanSstAnomaly,
} from '@/lib/oceanHealth';

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

describe('ocean health loaders', () => {
  const originalFetch = global.fetch;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const respondWith = (data: unknown, meta: unknown): jest.Mock => {
    const fetchMock = jest.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, status: 200, data, meta }),
    }));
    global.fetch = fetchMock as unknown as typeof global.fetch;
    return fetchMock;
  };

  const requestedPath = (fetchMock: jest.Mock): string =>
    new URL(fetchMock.mock.calls[0][0] as string).pathname;

  const LOADERS = [
    [
      'getOceanSst',
      getOceanSst,
      '/ocean-health/sea-surface-temperature',
      OCEAN_SST_DAILY_FIXTURE,
      COPERNICUS_META,
    ],
    [
      'getOceanSstAnomaly',
      getOceanSstAnomaly,
      '/ocean-health/sea-surface-anomaly',
      OCEAN_SST_ANOMALY_FIXTURE,
      OWID_OCEAN_META,
    ],
    [
      'getOceanHeatContent',
      getOceanHeatContent,
      '/ocean-health/ocean-heat-content',
      OCEAN_HEAT_FIXTURE,
      OWID_OCEAN_META,
    ],
    [
      'getOceanSeaLevel',
      getOceanSeaLevel,
      '/ocean-health/sea-level',
      OCEAN_SEA_LEVEL_FIXTURE,
      NOAA_LSA_META,
    ],
    ['getOceanPh', getOceanPh, '/ocean-health/ocean-ph', OCEAN_PH_FIXTURE, OWID_OCEAN_META],
  ] as const;

  it.each(LOADERS)(
    '%s should resolve ok with its payload and meta from its own path',
    async (_name, loader, path, data, meta) => {
      const fetchMock = respondWith(data, meta);

      const result = await loader();

      if (result.kind !== 'ok') throw new Error('expected an ok result');
      expect(result.payload.data).toEqual(data);
      expect(result.payload.meta).toEqual(meta);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(requestedPath(fetchMock)).toBe(`/api/v1${path}`);
    },
  );

  it.each(LOADERS)(
    '%s should resolve provider-unavailable when the BFF reports its provider 502',
    async (_name, loader) => {
      const fetchMock = jest.fn().mockImplementation(async () => ({
        ok: false,
        status: 502,
        json: async () => ({ success: false, error: 'Data provider unavailable', status: 502 }),
      }));
      global.fetch = fetchMock as unknown as typeof global.fetch;

      await expect(loader()).resolves.toEqual({ kind: 'provider-unavailable' });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  const withoutNotice = <T extends { origin: object }>(data: T): T => ({
    ...data,
    origin: { ...data.origin, notice: undefined },
  });

  const REJECTED = [
    [
      'a 365-slot year of the daily series',
      getOceanSst,
      {
        ...OCEAN_SST_DAILY_FIXTURE,
        years: [{ year: 2024, values: new Array(365).fill(20) }],
      },
      COPERNICUS_META,
    ],
    [
      'a 365-slot climatology',
      getOceanSst,
      { ...OCEAN_SST_DAILY_FIXTURE, climatology: new Array(365).fill(20) },
      COPERNICUS_META,
    ],
    [
      'a daily point with a non-ISO date',
      getOceanSst,
      {
        ...OCEAN_SST_DAILY_FIXTURE,
        latest: { ...OCEAN_SST_DAILY_FIXTURE.latest, date: '24/11/2026' },
      },
      COPERNICUS_META,
    ],
    [
      'a daily point with an unknown status',
      getOceanSst,
      {
        ...OCEAN_SST_DAILY_FIXTURE,
        record: { ...OCEAN_SST_DAILY_FIXTURE.record, status: 'draft' },
      },
      COPERNICUS_META,
    ],
    [
      'an empty recent table',
      getOceanSst,
      { ...OCEAN_SST_DAILY_FIXTURE, recent: [] },
      COPERNICUS_META,
    ],
    [
      'a daily origin without its notice',
      getOceanSst,
      withoutNotice(OCEAN_SST_DAILY_FIXTURE),
      COPERNICUS_META,
    ],
    [
      'a region shorter than the year range',
      getOceanSstAnomaly,
      {
        ...OCEAN_SST_ANOMALY_FIXTURE,
        regions: [{ ...OCEAN_SST_ANOMALY_FIXTURE.regions[0], upper: [1, 2] }],
      },
      OWID_OCEAN_META,
    ],
    [
      'no regions',
      getOceanSstAnomaly,
      { ...OCEAN_SST_ANOMALY_FIXTURE, regions: [] },
      OWID_OCEAN_META,
    ],
    [
      'an anomaly origin without its notice',
      getOceanSstAnomaly,
      withoutNotice(OCEAN_SST_ANOMALY_FIXTURE),
      OWID_OCEAN_META,
    ],
    [
      'a source shorter than the year range',
      getOceanHeatContent,
      {
        ...OCEAN_HEAT_FIXTURE,
        depths: [
          {
            ...OCEAN_HEAT_FIXTURE.depths[0],
            sources: [{ id: 'iap', name: 'IAP', values: [1, 2] }],
          },
        ],
      },
      OWID_OCEAN_META,
    ],
    [
      'a depth without sources',
      getOceanHeatContent,
      { ...OCEAN_HEAT_FIXTURE, depths: [{ ...OCEAN_HEAT_FIXTURE.depths[0], sources: [] }] },
      OWID_OCEAN_META,
    ],
    [
      'a heat content origin without its notice',
      getOceanHeatContent,
      {
        ...OCEAN_HEAT_FIXTURE,
        origins: [{ ...OCEAN_HEAT_FIXTURE.origins[0], notice: undefined }],
      },
      OWID_OCEAN_META,
    ],
    [
      'no heat content origins',
      getOceanHeatContent,
      { ...OCEAN_HEAT_FIXTURE, origins: [] },
      OWID_OCEAN_META,
    ],
    ['no missions', getOceanSeaLevel, { ...OCEAN_SEA_LEVEL_FIXTURE, missions: [] }, NOAA_LSA_META],
    [
      'sea level yearly means missing',
      getOceanSeaLevel,
      { ...OCEAN_SEA_LEVEL_FIXTURE, annual: undefined },
      NOAA_LSA_META,
    ],
    [
      'sea level yearly means not aligned to their years',
      getOceanSeaLevel,
      {
        ...OCEAN_SEA_LEVEL_FIXTURE,
        annual: { ...OCEAN_SEA_LEVEL_FIXTURE.annual, endYear: 2026 },
      },
      NOAA_LSA_META,
    ],
    [
      'sea level yearly means for fewer missions than served',
      getOceanSeaLevel,
      {
        ...OCEAN_SEA_LEVEL_FIXTURE,
        annual: {
          ...OCEAN_SEA_LEVEL_FIXTURE.annual,
          missions: OCEAN_SEA_LEVEL_FIXTURE.annual.missions.slice(1),
        },
      },
      NOAA_LSA_META,
    ],
    [
      'a mission whose values do not match its dates',
      getOceanSeaLevel,
      {
        ...OCEAN_SEA_LEVEL_FIXTURE,
        missions: [{ ...OCEAN_SEA_LEVEL_FIXTURE.missions[0], values: [1] }],
      },
      NOAA_LSA_META,
    ],
    [
      'a mission with a non-ISO date',
      getOceanSeaLevel,
      {
        ...OCEAN_SEA_LEVEL_FIXTURE,
        missions: [{ ...OCEAN_SEA_LEVEL_FIXTURE.missions[0], dates: ['1992.96', '1993-01-15'] }],
      },
      NOAA_LSA_META,
    ],
    [
      'a sea level end date that does not exist',
      getOceanSeaLevel,
      { ...OCEAN_SEA_LEVEL_FIXTURE, endDate: '2025-02-31' },
      NOAA_LSA_META,
    ],
    [
      'a sea level origin without its notice',
      getOceanSeaLevel,
      withoutNotice(OCEAN_SEA_LEVEL_FIXTURE),
      NOAA_LSA_META,
    ],
    [
      'a pH series with unequal lengths',
      getOceanPh,
      { ...OCEAN_PH_FIXTURE, yearlyAverage: [8.1] },
      OWID_OCEAN_META,
    ],
    [
      'a pH series with a non-ISO date',
      getOceanPh,
      { ...OCEAN_PH_FIXTURE, dates: ['1988-10', ...OCEAN_PH_FIXTURE.dates.slice(1)] },
      OWID_OCEAN_META,
    ],
    [
      'a pH origin without its notice',
      getOceanPh,
      withoutNotice(OCEAN_PH_FIXTURE),
      OWID_OCEAN_META,
    ],
    ['a non-object payload', getOceanSeaLevel, 'nope', NOAA_LSA_META],
  ] as const;

  it.each(REJECTED)(
    'should reject %s after retrying past the Data Cache',
    async (_label, loader, data, meta) => {
      const fetchMock = respondWith(data, meta);

      await expect(loader()).rejects.toThrow('could not be fetched from the BFF');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    },
  );

  it('should reject a response without meta', async () => {
    respondWith(OCEAN_PH_FIXTURE, undefined);

    await expect(getOceanPh()).rejects.toThrow('could not be fetched from the BFF');
  });
});
