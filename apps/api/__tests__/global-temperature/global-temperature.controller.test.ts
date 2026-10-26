import { readFileSync } from 'fs';
import { join } from 'path';

import { HttpService } from '@nestjs/axios';
import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import supertest from 'supertest';

import { GlobalTemperatureData, listCountryEntityCodes } from '@eco-metrics/shared';

import { AppModule } from '../../src/app/app.module';
import { applyGlobalPipeline } from '../../src/app/global-pipeline';
import { OUTBOUND_FETCH } from '../../src/common/http/outbound-http-client.service';
import { OWID_PUBLISHER } from '../../src/modules/providers/owid/owid.attribution';

const FIXTURES = join(__dirname, 'fixtures');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

function metadataWith(overrides: Record<string, unknown>): string {
  const metadata = JSON.parse(fixture('indicator-1325256-metadata.json')) as Record<
    string,
    unknown
  >;
  return JSON.stringify({ ...metadata, ...overrides });
}

type Route = (url: string) => Response;

const okRoutes: Route = (url) => {
  if (url.includes('/grapher/annual-temperature-anomalies.csv')) {
    return new Response(fixture('annual-temperature-anomalies.csv'), { status: 200 });
  }
  if (url.includes('/indicators/1325256.metadata.json')) {
    return new Response(fixture('indicator-1325256-metadata.json'), { status: 200 });
  }
  if (url.includes('/grapher/temperature-anomaly.csv')) {
    return new Response(fixture('temperature-anomaly.csv'), { status: 200 });
  }
  if (url.includes('/indicators/1325020.metadata.json')) {
    return new Response(fixture('indicator-1325020-metadata.json'), { status: 200 });
  }
  return new Response('not found', { status: 404 });
};

async function createApp(route: Route): Promise<{ app: INestApplication; fetchStub: jest.Mock }> {
  const fetchStub = jest.fn((input: string | URL) => Promise.resolve(route(String(input))));
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(OUTBOUND_FETCH)
    .useValue(fetchStub)
    .overrideProvider(HttpService)
    .useValue({ request: () => of({ status: 200, data: {} }) })
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  applyGlobalPipeline(app);
  await app.init();
  return { app, fetchStub };
}

/** Freezes only the calendar: timers, sockets and microtasks keep running. */
function useClock(isoDate: string): void {
  jest.useFakeTimers({
    now: new Date(isoDate),
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
}

describe('GET /api/v1/global-temperature', () => {
  let app: INestApplication;
  let fetchStub: jest.Mock;

  beforeAll(async () => {
    useClock('2026-10-25T12:00:00.000Z');
    ({ app, fetchStub } = await createApp(okRoutes));
  });

  afterAll(async () => {
    await app.close();
    jest.useRealTimers();
  });

  it('should answer 200 with the envelope, World first and the fixture countries', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/global-temperature');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe(200);
    const data = response.body.data as GlobalTemperatureData;
    expect(data.startYear).toBe(1940);
    expect(data.endYear).toBe(1942);
    expect(data.baseline).toEqual({ startYear: 1991, endYear: 2020 });
    expect(data.unit).toBe('°C');
    expect(data.entities[0].code).toBe('OWID_WRL');
    expect(data.entities.map((e) => e.code)).toEqual(['OWID_WRL', 'ARG', 'OWID_KOS', 'USA']);
    expect(data.origin.producer).toBe('Copernicus Climate Change Service (C3S)');
    expect(data.origin.license.name).toBe('CC BY 4.0');
    expect(data.origin.disclaimer).toContain('Neither the European Commission nor ECMWF');
  });

  it('should attach the publisher, provider timestamp and fetch time as meta', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/global-temperature');

    expect(response.body.meta.source).toEqual({
      ...OWID_PUBLISHER,
      lastUpdated: '2026-10-13T08:42:32.000Z',
    });
    expect(new Date(response.body.meta.fetchedAt).toISOString()).toBe(response.body.meta.fetchedAt);
  });

  it('should identify the OWID dataset and credit the Copernicus origin', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/global-temperature');

    expect(response.body.data.dataset).toEqual({
      name: 'Annual surface temperatures and anomalies by country',
      version: '2026-10-12',
    });
    expect(response.body.data.origin.notice).toBe(
      'Contains modified Copernicus Climate Change Service information (2026)',
    );
  });

  it('should request the chart tab, the column and the allowlist up to the previous year', async () => {
    await supertest(app.getHttpServer()).get('/api/v1/global-temperature');

    const urls = fetchStub.mock.calls.map(([url]) => String(url));
    const chartUrl = urls.find((url) => url.includes('/grapher/annual-temperature-anomalies.csv'));
    expect(chartUrl).toBeDefined();
    expect(chartUrl).toContain('&tab=chart&country=');
    const query = new URL(chartUrl ?? '').searchParams;
    expect(query.get('tab')).toBe('chart');
    expect(query.get('country')?.split('~')).toEqual(listCountryEntityCodes());
    expect(query.get('time')).toBe('1940..2025');
    expect(urls.some((url) => url.includes('/indicators/1325256.metadata.json'))).toBe(true);
  });

  it('should ignore unknown query parameters', async () => {
    const plain = await supertest(app.getHttpServer()).get('/api/v1/global-temperature');
    const withQuery = await supertest(app.getHttpServer()).get(
      '/api/v1/global-temperature?country=ARG',
    );

    expect(withQuery.status).toBe(200);
    expect(withQuery.body.data).toEqual(plain.body.data);
  });

  it('should list one OWID entry in the catalog with both categories', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/data-sources');

    const providers = response.body.data.providers as { id: string; categories: string[] }[];
    const owid = providers.filter((p) => p.id === 'owid');
    expect(owid).toHaveLength(1);
    expect(owid[0].categories).toEqual(
      expect.arrayContaining(['co2-emissions', 'global-temperature']),
    );
  });

  it('should keep the dependencies check at a single owid indicator', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/health/dependencies');

    expect(Object.keys(response.body.details)).toEqual(['owid']);
  });

  it('should document the endpoint in Swagger with its 200 and 502 responses', () => {
    const document: OpenAPIObject = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('test').build(),
    );

    const operation = document.paths['/api/v1/global-temperature']?.get;
    expect(operation?.tags).toEqual(['Global Temperature']);
    expect(Object.keys(operation?.responses ?? {})).toEqual(expect.arrayContaining(['200', '502']));
  });
});

describe('GET /api/v1/global-temperature global series', () => {
  let app: INestApplication;
  let fetchStub: jest.Mock;

  beforeAll(async () => {
    useClock('2026-10-25T12:00:00.000Z');
    ({ app, fetchStub } = await createApp(okRoutes));
  });

  afterAll(async () => {
    await app.close();
    jest.useRealTimers();
  });

  it('should serve the World series since 1850 with its bounds, baseline and origin', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/global-temperature');

    const { global } = response.body.data as GlobalTemperatureData;
    expect(global.startYear).toBe(1850);
    expect(global.endYear).toBe(1852);
    expect(global.mean).toHaveLength(3);
    expect(global.lower).toEqual([-0.24, null, -0.02]);
    expect(global.baseline).toEqual({ startYear: 1861, endYear: 1890 });
    expect(global.dataset).toEqual({
      name: 'Climate Change Impacts - Annual',
      version: '2026-10-12',
    });
    expect(global.origin.license.name).toBe('Open Government Licence v3.0');
    expect(global.origin.citation).toContain('Morice et al. (2021)');
  });

  it('should request the chart tab for World only, up to the previous year, in one download', async () => {
    fetchStub.mockClear();
    const fresh = await createApp(okRoutes);

    await supertest(fresh.app.getHttpServer()).get('/api/v1/global-temperature');

    const urls = fresh.fetchStub.mock.calls.map(([url]) => String(url));
    const globalUrls = urls.filter((url) => url.includes('/grapher/temperature-anomaly.csv'));
    expect(globalUrls).toHaveLength(1);
    const query = new URL(globalUrls[0]).searchParams;
    expect(query.get('tab')).toBe('chart');
    expect(query.get('country')).toBe('OWID_WRL');
    expect(query.get('time')).toBe('1850..2025');
    expect(urls.some((url) => url.includes('/indicators/1325020.metadata.json'))).toBe(true);
    await fresh.app.close();
  });

  it('should not serve the partial current year', async () => {
    const withPartialYear = `${fixture('temperature-anomaly.csv')}World,OWID_WRL,2026,1.41,1.37,1.45\n`;
    const partial = await createApp((url) =>
      url.includes('/grapher/temperature-anomaly.csv')
        ? new Response(withPartialYear, { status: 200 })
        : okRoutes(url),
    );

    const response = await supertest(partial.app.getHttpServer()).get('/api/v1/global-temperature');

    expect(response.body.data.global.endYear).toBe(1852);
    await partial.app.close();
  });

  it('should take meta.lastUpdated from the latest indicator timestamp', async () => {
    const newer = await createApp((url) =>
      url.includes('/indicators/1325020.metadata.json')
        ? new Response(
            JSON.stringify({
              ...JSON.parse(fixture('indicator-1325020-metadata.json')),
              updatedAt: '2026-11-01T00:00:00.000Z',
            }),
            { status: 200 },
          )
        : okRoutes(url),
    );

    const response = await supertest(newer.app.getHttpServer()).get('/api/v1/global-temperature');

    expect(response.body.meta.source.lastUpdated).toBe('2026-11-01T00:00:00.000Z');
    await newer.app.close();
  });

  it('should list ERA5 and HadCRUT5 as origins of global-temperature in the catalog', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/data-sources');

    const owid = response.body.data.providers.find((p: { id: string }) => p.id === 'owid');
    const producers = owid.origins.map((origin: { producer: string; categories: string[] }) => [
      origin.producer,
      origin.categories,
    ]);
    expect(producers).toEqual([
      ['Copernicus Climate Change Service (C3S)', ['global-temperature']],
      ['Global Carbon Project', ['co2-emissions']],
      ['Met Office Hadley Centre', ['global-temperature']],
    ]);
    const era5 = owid.origins[0];
    expect(era5.notice).toBe('Contains modified Copernicus Climate Change Service information');
    expect(era5.license.name).toBe('CC BY 4.0');
  });
});

describe('GET /api/v1/global-temperature request window', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should cap the request at the previous year after a year rollover', async () => {
    useClock('2027-01-02T00:00:00.000Z');
    const { app, fetchStub } = await createApp(okRoutes);

    await supertest(app.getHttpServer()).get('/api/v1/global-temperature');

    const chartUrl = fetchStub.mock.calls
      .map(([url]) => String(url))
      .find((url) => url.includes('/grapher/'));
    expect(new URL(chartUrl ?? '').searchParams.get('time')).toBe('1940..2026');
    await app.close();
  });
});

describe('GET /api/v1/global-temperature provider failures', () => {
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  async function expectBadGateway(route: Route): Promise<void> {
    const { app } = await createApp(route);

    const response = await supertest(app.getHttpServer()).get('/api/v1/global-temperature');

    expect(response.status).toBe(502);
    expect(response.body.success).toBe(false);
    expect(response.body).not.toHaveProperty('data');
    await app.close();
  }

  it('should answer 502 when the transport fails every attempt with 503', async () => {
    await expectBadGateway(() => new Response('unavailable', { status: 503 }));
  }, 15_000);

  it('should answer 502 when the CSV header is malformed', async () => {
    await expectBadGateway((url) =>
      url.includes('.csv')
        ? new Response('country,iso,year,value\nA,B,1950,1\n', { status: 200 })
        : okRoutes(url),
    );
  });

  it('should answer 502 when the World entity is missing', async () => {
    const withoutWorld = fixture('annual-temperature-anomalies.csv')
      .split('\n')
      .filter((line) => !line.includes('OWID_WRL'))
      .join('\n');

    await expectBadGateway((url) =>
      url.includes('.csv') ? new Response(withoutWorld, { status: 200 }) : okRoutes(url),
    );
  });

  it('should answer 502 for a map-tab shaped response with one year per entity', async () => {
    const mapShaped = [
      'entity,code,year,temperature_anomaly',
      'Argentina,ARG,2025,0.5',
      'World,OWID_WRL,2025,0.59',
    ].join('\n');

    await expectBadGateway((url) =>
      url.includes('.csv') ? new Response(mapShaped, { status: 200 }) : okRoutes(url),
    );
  });

  it('should answer 502 when the provider changes the baseline', async () => {
    await expectBadGateway((url) =>
      url.includes('/indicators/')
        ? new Response(metadataWith({ descriptionShort: 'From the 2001-2030 mean.' }), {
            status: 200,
          })
        : okRoutes(url),
    );
  });

  it('should answer 502 when the short description is missing', async () => {
    await expectBadGateway((url) =>
      url.includes('/indicators/')
        ? new Response(metadataWith({ descriptionShort: undefined }), { status: 200 })
        : okRoutes(url),
    );
  });

  it('should answer 502 when only the pre-industrial baseline changes', async () => {
    await expectBadGateway((url) =>
      url.includes('/indicators/1325020.metadata.json')
        ? new Response(
            JSON.stringify({
              ...JSON.parse(fixture('indicator-1325020-metadata.json')),
              descriptionShort: 'compared to the 1961-1990 mean',
            }),
            { status: 200 },
          )
        : okRoutes(url),
    );
  });

  it('should answer 502 when the global series has no World entity', async () => {
    const withoutWorld = fixture('temperature-anomaly.csv')
      .split('\n')
      .filter((line) => !line.includes('OWID_WRL'))
      .join('\n');

    await expectBadGateway((url) =>
      url.includes('/grapher/temperature-anomaly.csv')
        ? new Response(withoutWorld, { status: 200 })
        : okRoutes(url),
    );
  });

  it('should answer 502 when the global series request fails', async () => {
    await expectBadGateway((url) =>
      url.includes('/grapher/temperature-anomaly.csv')
        ? new Response('unavailable', { status: 503 })
        : okRoutes(url),
    );
  }, 15_000);

  it('should answer 502 when the dataset version has no year', async () => {
    await expectBadGateway((url) =>
      url.includes('/indicators/')
        ? new Response(metadataWith({ datasetVersion: 'latest' }), { status: 200 })
        : okRoutes(url),
    );
  });
});
