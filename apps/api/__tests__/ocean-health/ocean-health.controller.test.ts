import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import supertest from 'supertest';

import type {
  OceanHeatContentData,
  OceanPhData,
  OceanSeaLevelData,
  OceanSstAnomalyData,
  OceanSstDailyData,
} from '@eco-metrics/shared';

import {
  COPERNICUS_CLIMATE_PULSE_PUBLISHER,
  NOAA_LSA_PUBLISHER,
  OWID_PUBLISHER,
} from '../../src/common/publishers/publishers';
import { SNAPSHOT_STORE } from '../../src/common/snapshots/snapshot-store';
import { OCEAN_HEALTH_SNAPSHOT_KEYS } from '../../src/modules/ocean-health/ocean-health.constants';
import { CopernicusClimatePulseClient } from '../../src/modules/providers/copernicus-climate-pulse/copernicus-climate-pulse-client.service';
import { StubSnapshotStore } from '../common/snapshots/stub-snapshot-store';

import { Route, createApp, jsonFixture, okRoutes, silenceLogger, useClock } from './helpers';

const BASE = '/api/v1/ocean-health';
const SECTIONS = [
  'sea-surface-temperature',
  'sea-surface-anomaly',
  'ocean-heat-content',
  'sea-level',
  'ocean-ph',
] as const;

const PROVIDER_ERROR_BODY = {
  success: false,
  error: 'Data provider unavailable or returned invalid data',
  status: 502,
};

const COPERNICUS_URL = 'era5_daily_series_sst_60S-60N_ocean.csv';
const NOAA_URL = 'slr_sla_gbl_free_ref_90.csv';
const HEADER_ONLY_COPERNICUS_CSV = [
  '# Units: deg. C',
  '# Last updated: 24 Nov 2026',
  'date,sst,clim_91-20,ano_91-20,status',
  '',
].join('\n');

function failing(urlPart: string): Route {
  return (url) =>
    url.includes(urlPart) ? new Response('unavailable', { status: 503 }) : okRoutes(url);
}

describe('GET /api/v1/ocean-health healthy providers', () => {
  let app: INestApplication;
  let fetchStub: jest.Mock;

  beforeAll(async () => {
    useClock('2026-11-24T12:00:00.000Z');
    ({ app, fetchStub } = await createApp(okRoutes));
  });

  afterAll(async () => {
    await app.close();
    jest.useRealTimers();
  });

  it('should answer 200 with the envelope for each of the five sections', async () => {
    for (const section of SECTIONS) {
      const response = await supertest(app.getHttpServer()).get(`${BASE}/${section}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe(200);
      expect(response.body.meta.stale).toBe(false);
      expect(new Date(response.body.meta.fetchedAt).toISOString()).toBe(
        response.body.meta.fetchedAt,
      );
    }
  });

  it('should name the provider of each section in meta.source with its own lastUpdated', async () => {
    const get = async (section: string) =>
      (await supertest(app.getHttpServer()).get(`${BASE}/${section}`)).body.meta.source;

    expect(await get('sea-surface-temperature')).toEqual({
      ...COPERNICUS_CLIMATE_PULSE_PUBLISHER,
      lastUpdated: '2026-11-24T00:00:00.000Z',
    });
    expect(await get('sea-surface-anomaly')).toEqual({
      ...OWID_PUBLISHER,
      lastUpdated: '2026-11-11T21:16:33.000Z',
    });
    expect((await get('ocean-heat-content')).provider).toBe('Our World in Data');
    expect(await get('ocean-heat-content')).toMatchObject({
      lastUpdated: '2026-11-11T21:16:32.000Z',
    });
    const seaLevel = await get('sea-level');
    expect(seaLevel).toMatchObject({ ...NOAA_LSA_PUBLISHER });
    expect(new Date(seaLevel.lastUpdated).toISOString()).toBe(seaLevel.lastUpdated);
    expect(await get('ocean-ph')).toEqual({
      ...OWID_PUBLISHER,
      lastUpdated: '2026-11-11T21:16:30.000Z',
    });
  });

  it('should serve the payload of each section', async () => {
    const get = async <T>(section: string): Promise<T> =>
      (await supertest(app.getHttpServer()).get(`${BASE}/${section}`)).body.data as T;

    const daily = await get<OceanSstDailyData>('sea-surface-temperature');
    expect(daily.latest.date).toBe('2025-04-20');
    expect(daily.years[0].values).toHaveLength(366);
    expect(daily.origin.license.name).toBe('CC BY 4.0');

    const anomaly = await get<OceanSstAnomalyData>('sea-surface-anomaly');
    expect(anomaly.regions.map(({ code }) => code)).toEqual(['OWID_WRL', 'OWID_NH', 'OWID_SH']);
    expect(anomaly.endYear).toBe(2025);
    expect(anomaly.baseline).toEqual({ startYear: 1861, endYear: 1890 });

    const heat = await get<OceanHeatContentData>('ocean-heat-content');
    expect(heat.depths.map(({ id }) => id)).toEqual(['700m', '2000m']);
    expect(heat.unit).toBe('10²² J');

    const seaLevel = await get<OceanSeaLevelData>('sea-level');
    expect(seaLevel.trend.value).toBe(3.11);
    expect(seaLevel.missions).toHaveLength(4);
    expect(seaLevel.origin.notice).toBe(
      'Altimetry data are provided by NOAA Laboratory for Satellite Altimetry.',
    );

    const ph = await get<OceanPhData>('ocean-ph');
    expect(ph.station).toBe('Hawaii');
    expect(ph.dates.at(-1)).toBe('2024-12-20');
  });

  it('should request the anomaly chart tab with the three entities and no time range', async () => {
    await supertest(app.getHttpServer()).get(`${BASE}/sea-surface-anomaly`);

    const url = fetchStub.mock.calls
      .map(([input]) => String(input))
      .find((input) => input.includes('/grapher/sea-surface-temperature-anomaly.csv'));
    const query = new URL(url ?? '').searchParams;
    expect(query.get('tab')).toBe('chart');
    expect(query.get('country')).toBe('OWID_NH~OWID_SH~OWID_WRL');
    expect(query.has('time')).toBe(false);
  });

  it('should request the heat content charts for World with the chart tab', async () => {
    await supertest(app.getHttpServer()).get(`${BASE}/ocean-heat-content`);

    const urls = fetchStub.mock.calls.map(([input]) => String(input));
    for (const slug of ['ocean-heat-content-upper', 'ocean-heat-top-2000m']) {
      const url = urls.find((input) => input.includes(`/grapher/${slug}.csv`));
      const query = new URL(url ?? '').searchParams;
      expect(query.get('tab')).toBe('chart');
      expect(query.get('country')).toBe('OWID_WRL');
    }
  });

  it('should ignore unknown query parameters', async () => {
    for (const section of SECTIONS) {
      const plain = await supertest(app.getHttpServer()).get(`${BASE}/${section}`);
      const withQuery = await supertest(app.getHttpServer()).get(`${BASE}/${section}?country=ARG`);

      expect(withQuery.status).toBe(200);
      expect(withQuery.body.data).toEqual(plain.body.data);
    }
  });

  it('should list one OWID entry covering ocean-health and the two new providers', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/data-sources');

    const providers = response.body.data.providers as {
      id: string;
      categories: string[];
      origins: { producer: string; title: string; categories: string[] }[];
    }[];
    const owid = providers.filter(({ id }) => id === 'owid');
    expect(owid).toHaveLength(1);
    expect(owid[0].categories).toContain('ocean-health');
    const oceanOrigins = owid[0].origins
      .filter(({ categories }) => categories.includes('ocean-health'))
      .map(({ producer }) => producer);
    expect(oceanOrigins).toEqual([
      'Met Office Hadley Centre',
      'NOAA National Centers for Environmental Information',
      'School of Ocean & Earth Science & Technology',
      'United States Environmental Protection Agency',
    ]);

    const copernicus = providers.find(({ id }) => id === 'copernicus-climate-pulse');
    const noaa = providers.find(({ id }) => id === 'noaa-lsa');
    expect(copernicus?.categories).toEqual(['ocean-health']);
    expect(copernicus?.origins).toHaveLength(1);
    expect(noaa?.categories).toEqual(['ocean-health']);
    expect(noaa?.origins[0].producer).toBe('NOAA Laboratory for Satellite Altimetry');
  });

  it('should list one dependencies indicator per provider', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/health/dependencies');

    expect(response.status).toBe(200);
    expect(Object.keys(response.body.details)).toEqual([
      'owid',
      'copernicus-climate-pulse',
      'noaa-lsa',
    ]);
  });

  it('should document the five routes in Swagger with their 200 and 502 responses', () => {
    const document: OpenAPIObject = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('test').build(),
    );

    for (const section of SECTIONS) {
      const operation = document.paths[`${BASE}/${section}`]?.get;
      expect(operation?.tags).toEqual(['Ocean Health']);
      expect(operation?.summary).toBeTruthy();
      expect(Object.keys(operation?.responses ?? {})).toEqual(
        expect.arrayContaining(['200', '502']),
      );
    }
  });
});

describe('GET /api/v1/ocean-health request window', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should serve the new year once the previous one is complete', async () => {
    useClock('2027-01-02T00:00:00.000Z');
    const { app } = await createApp(okRoutes);

    const response = await supertest(app.getHttpServer()).get(`${BASE}/sea-surface-anomaly`);

    expect(response.body.data.endYear).toBe(2026);
    await app.close();
  });
});

describe('GET /api/v1/ocean-health provider independence', () => {
  let spies: jest.SpyInstance[];

  beforeEach(() => {
    spies = silenceLogger();
  });

  afterEach(() => {
    spies.forEach((spy) => spy.mockRestore());
  });

  async function statuses(route: Route, store = new StubSnapshotStore()) {
    const { app } = await createApp(route, (builder) => {
      builder.overrideProvider(SNAPSHOT_STORE).useValue(store);
    });
    const result: Record<string, { status: number; body: Record<string, unknown> }> = {};
    for (const section of SECTIONS) {
      const response = await supertest(app.getHttpServer()).get(`${BASE}/${section}`);
      result[section] = { status: response.status, body: response.body };
    }
    await app.close();
    return result;
  }

  it('should answer 502 only for the sea surface temperature when Copernicus is down', async () => {
    const result = await statuses(failing(COPERNICUS_URL));

    expect(result['sea-surface-temperature'].status).toBe(502);
    expect(result['sea-surface-temperature'].body).toEqual(PROVIDER_ERROR_BODY);
    for (const section of SECTIONS.slice(1)) {
      expect(result[section].status).toBe(200);
    }
  }, 20_000);

  it('should answer 502 only for the sea level when NOAA LSA is down', async () => {
    const result = await statuses(failing(NOAA_URL));

    expect(SECTIONS.filter((section) => result[section].status === 502)).toEqual(['sea-level']);
  }, 20_000);

  it('should answer 502 for the three OWID sections and 200 for the others when OWID is down', async () => {
    const result = await statuses(failing('/grapher/'));

    expect(SECTIONS.filter((section) => result[section].status === 502)).toEqual([
      'sea-surface-anomaly',
      'ocean-heat-content',
      'ocean-ph',
    ]);
  }, 30_000);

  it('should answer 502 when the Copernicus layout changes', async () => {
    const result = await statuses((url) =>
      url.includes(COPERNICUS_URL)
        ? new Response('# Units: K\ndate,sst\n', { status: 200 })
        : okRoutes(url),
    );

    expect(result['sea-surface-temperature'].status).toBe(502);
    expect(result['sea-level'].status).toBe(200);
  });

  it('should answer 502 when the Copernicus file has no data rows', async () => {
    const result = await statuses((url) =>
      url.includes(COPERNICUS_URL)
        ? new Response(HEADER_ONLY_COPERNICUS_CSV, { status: 200 })
        : okRoutes(url),
    );

    expect(result['sea-surface-temperature'].status).toBe(502);
    expect(result['sea-surface-temperature'].body).toEqual(PROVIDER_ERROR_BODY);
    expect(result['sea-level'].status).toBe(200);
  });

  it('should answer 502 when the NOAA trend line disappears', async () => {
    const result = await statuses((url) =>
      url.includes(NOAA_URL) ? new Response('year,A\n2000.5,1\n', { status: 200 }) : okRoutes(url),
    );

    expect(result['sea-level'].status).toBe(502);
  });

  it('should answer 502 when the HadSST baseline changes', async () => {
    const metadata = jsonFixture<Record<string, unknown>>('indicator-1357160-metadata.json');
    const result = await statuses((url) =>
      url.includes('/indicators/1357160.metadata.json')
        ? new Response(
            JSON.stringify({ ...metadata, descriptionShort: 'From the 1961-1990 mean.' }),
            { status: 200 },
          )
        : okRoutes(url),
    );

    expect(result['sea-surface-anomaly'].status).toBe(502);
  });
});

describe('GET /api/v1/ocean-health snapshot fallback', () => {
  const STORED_AT = '2026-11-23T10:00:00.000Z';
  let spies: jest.SpyInstance[];

  beforeEach(() => {
    spies = silenceLogger();
  });

  afterEach(() => {
    spies.forEach((spy) => spy.mockRestore());
  });

  function seeded(key: string, marker: string): StubSnapshotStore {
    return new StubSnapshotStore().seed(key, {
      fetchedAt: STORED_AT,
      contentHash: 'stored-hash',
      payload: { data: { marker }, lastUpdated: '2026-11-01T00:00:00.000Z' },
    });
  }

  it('should serve the stored sea surface temperature as stale while the others stay fresh', async () => {
    const store = seeded(OCEAN_HEALTH_SNAPSHOT_KEYS.seaSurfaceTemperature, 'stored-sst');
    const { app } = await createApp(failing(COPERNICUS_URL), (builder) => {
      builder.overrideProvider(SNAPSHOT_STORE).useValue(store);
    });

    const stale = await supertest(app.getHttpServer()).get(`${BASE}/sea-surface-temperature`);
    const fresh = await supertest(app.getHttpServer()).get(`${BASE}/ocean-ph`);

    expect(stale.status).toBe(200);
    expect(stale.body.data).toEqual({ marker: 'stored-sst' });
    expect(stale.body.meta).toMatchObject({
      stale: true,
      fetchedAt: STORED_AT,
      source: { ...COPERNICUS_CLIMATE_PULSE_PUBLISHER, lastUpdated: '2026-11-01T00:00:00.000Z' },
    });
    expect(fresh.body.meta.stale).toBe(false);
    await app.close();
  }, 15_000);

  it('should serve the stored sea level as stale when NOAA LSA is down', async () => {
    const store = seeded(OCEAN_HEALTH_SNAPSHOT_KEYS.seaLevel, 'stored-sea-level');
    const { app } = await createApp(failing(NOAA_URL), (builder) => {
      builder.overrideProvider(SNAPSHOT_STORE).useValue(store);
    });

    const response = await supertest(app.getHttpServer()).get(`${BASE}/sea-level`);

    expect(response.status).toBe(200);
    expect(response.body.meta).toMatchObject({ stale: true, fetchedAt: STORED_AT });
    await app.close();
  }, 15_000);

  it('should use the five fixed snapshot keys, each a lowercase slug', () => {
    expect(OCEAN_HEALTH_SNAPSHOT_KEYS).toEqual({
      seaSurfaceTemperature: 'ocean-health-sea-surface-temperature',
      seaSurfaceAnomaly: 'ocean-health-sea-surface-anomaly',
      heatContent: 'ocean-health-heat-content',
      seaLevel: 'ocean-health-sea-level',
      ph: 'ocean-health-ph',
    });
    for (const key of Object.values(OCEAN_HEALTH_SNAPSHOT_KEYS)) {
      expect(key).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('should persist each section under its own key', async () => {
    const store = new StubSnapshotStore();
    const { app } = await createApp(okRoutes, (builder) => {
      builder.overrideProvider(SNAPSHOT_STORE).useValue(store);
    });

    for (const section of SECTIONS) {
      await supertest(app.getHttpServer()).get(`${BASE}/${section}`);
    }

    for (const key of Object.values(OCEAN_HEALTH_SNAPSHOT_KEYS)) {
      expect(store.stored(key)).toBeDefined();
    }
    await app.close();
  });

  it('should keep a plain Error as 500 even when a snapshot is stored', async () => {
    const store = seeded(OCEAN_HEALTH_SNAPSHOT_KEYS.seaSurfaceTemperature, 'stored-sst');
    const { app } = await createApp(okRoutes, (builder) => {
      builder.overrideProvider(SNAPSHOT_STORE).useValue(store);
      builder.overrideProvider(CopernicusClimatePulseClient).useValue({
        getDailySeaSurfaceTemperature: () => Promise.reject(new TypeError('bug')),
      });
    });

    const response = await supertest(app.getHttpServer()).get(`${BASE}/sea-surface-temperature`);

    expect(response.status).toBe(500);
    expect(store.count('read')).toBe(0);
    await app.close();
  });

  it('should answer 200 with fresh data when the store rejects every call', async () => {
    const { app } = await createApp(okRoutes, (builder) => {
      builder.overrideProvider(SNAPSHOT_STORE).useValue(new StubSnapshotStore().failEverything());
    });

    const response = await supertest(app.getHttpServer()).get(`${BASE}/sea-level`);

    expect(response.status).toBe(200);
    expect(response.body.meta.stale).toBe(false);
    await app.close();
  });
});
