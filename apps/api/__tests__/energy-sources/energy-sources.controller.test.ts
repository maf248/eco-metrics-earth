import { readFileSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

import { HttpService } from '@nestjs/axios';
import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import supertest from 'supertest';

import { EnergySourcesData, type MetricSeries, listCountryEntityCodes } from '@eco-metrics/shared';

import { AppModule } from '../../src/app/app.module';
import { applyGlobalPipeline } from '../../src/app/global-pipeline';
import { OUTBOUND_FETCH } from '../../src/common/http/outbound-http-client.service';
import {
  ENERGY_GENERATION_CHART,
  ENERGY_ORIGIN,
  type EnergyRawColumn,
} from '../../src/modules/energy-sources/energy-sources.constants';
import {
  buildEnergySourcesData,
  EnergySourcesService,
} from '../../src/modules/energy-sources/energy-sources.service';
import { OWID_PUBLISHER } from '../../src/modules/providers/owid/owid.attribution';

const FIXTURES = join(__dirname, 'fixtures');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

type Route = (url: string) => Response;

const okRoutes: Route = (url) => {
  if (url.includes('/grapher/electricity-production-by-source.csv')) {
    return new Response(fixture('electricity-production-by-source.csv'), { status: 200 });
  }
  if (url.includes('/indicators/1295503.metadata.json')) {
    return new Response(fixture('indicator-1295503-metadata.json'), { status: 200 });
  }
  return new Response('not found', { status: 404 });
};

async function createApp(
  route: Route,
  override?: (builder: ReturnType<typeof Test.createTestingModule>) => void,
): Promise<{ app: INestApplication; fetchStub: jest.Mock }> {
  const fetchStub = jest.fn((input: string | URL) => Promise.resolve(route(String(input))));
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(OUTBOUND_FETCH)
    .useValue(fetchStub)
    .overrideProvider(HttpService)
    .useValue({ request: () => of({ status: 200, data: {} }) });
  override?.(builder);
  const moduleRef: TestingModule = await builder.compile();
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

describe('GET /api/v1/energy-sources', () => {
  let app: INestApplication;

  beforeAll(async () => {
    useClock('2026-10-26T12:00:00.000Z');
    ({ app } = await createApp(okRoutes));
  });

  afterAll(async () => {
    await app.close();
    jest.useRealTimers();
  });

  it('should answer 200 with the envelope, World first and the fixture countries', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/energy-sources');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe(200);
    const data = response.body.data as EnergySourcesData;
    expect(data.startYear).toBe(2000);
    expect(data.endYear).toBe(2025);
    expect(data.unit).toBe('TWh');
    expect(data.entities.map((entity) => entity.code)).toEqual([
      'OWID_WRL',
      'DZA',
      'ARG',
      'BIH',
      'ESP',
    ]);
  });

  it('should attach the publisher, provider timestamp and fetch time as meta', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/energy-sources');

    expect(response.body.meta.source).toEqual({
      ...OWID_PUBLISHER,
      lastUpdated: '2026-09-10T01:11:13.000Z',
    });
    expect(new Date(response.body.meta.fetchedAt).toISOString()).toBe(response.body.meta.fetchedAt);
  });

  it('should identify the OWID dataset and credit the Ember origin', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/energy-sources');

    expect(response.body.data.dataset).toEqual({ name: 'Electricity mix', version: '2026-06-30' });
    expect(response.body.data.origin).toEqual(ENERGY_ORIGIN);
    expect(response.body.data.origin.producer).toBe('Ember');
    expect(response.body.data.origin.license.name).toBe('CC BY 4.0');
  });

  it('should ignore unknown query parameters', async () => {
    const plain = await supertest(app.getHttpServer()).get('/api/v1/energy-sources');
    const withQuery = await supertest(app.getHttpServer()).get(
      '/api/v1/energy-sources?country=ARG',
    );

    expect(withQuery.status).toBe(200);
    expect(withQuery.body.data).toEqual(plain.body.data);
  });

  it('should list one OWID entry in the catalog with the Ember origin', async () => {
    await supertest(app.getHttpServer()).get('/api/v1/energy-sources');
    const response = await supertest(app.getHttpServer()).get('/api/v1/data-sources');

    const providers = response.body.data.providers as {
      id: string;
      categories: string[];
      lastUpdatedBasis?: string;
      origins: { producer: string; categories: string[] }[];
    }[];
    const owid = providers.filter((provider) => provider.id === 'owid');
    expect(owid).toHaveLength(1);
    expect(owid[0].categories).toEqual(expect.arrayContaining(['energy-sources']));
    expect(owid[0].lastUpdatedBasis).toBe('provider');
    const ember = owid[0].origins.find((origin) => origin.producer === 'Ember');
    expect(ember).toMatchObject({ ...ENERGY_ORIGIN, categories: ['energy-sources'] });
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

    const operation = document.paths['/api/v1/energy-sources']?.get;
    expect(operation?.tags).toEqual(['Energy Sources']);
    expect(Object.keys(operation?.responses ?? {})).toEqual(expect.arrayContaining(['200', '502']));
  });
});

describe('GET /api/v1/energy-sources outbound requests', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should make exactly two requests on a cold cache, without a tab parameter', async () => {
    useClock('2026-10-26T12:00:00.000Z');
    const { app, fetchStub } = await createApp(okRoutes);

    await supertest(app.getHttpServer()).get('/api/v1/energy-sources');
    await supertest(app.getHttpServer()).get('/api/v1/energy-sources');

    const urls = fetchStub.mock.calls.map(([url]) => String(url));
    expect(urls).toHaveLength(2);
    const chartUrl = urls.find((url) =>
      url.includes('/grapher/electricity-production-by-source.csv'),
    );
    expect(chartUrl).toBeDefined();
    expect(chartUrl).not.toContain('tab=');
    const query = new URL(chartUrl ?? '').searchParams;
    expect(query.get('time')).toBe('2000..2026');
    expect(query.get('country')?.split('~')).toEqual(listCountryEntityCodes());
    expect(urls.some((url) => url.endsWith('/indicators/1295503.metadata.json'))).toBe(true);
    await app.close();
  });

  it('should move the end of the requested range with the calendar year', async () => {
    useClock('2027-01-02T00:00:00.000Z');
    const { app, fetchStub } = await createApp(okRoutes);

    await supertest(app.getHttpServer()).get('/api/v1/energy-sources');

    const chartUrl = fetchStub.mock.calls
      .map(([url]) => String(url))
      .find((url) => url.includes('/grapher/'));
    expect(new URL(chartUrl ?? '').searchParams.get('time')).toBe('2000..2027');
    await app.close();
  });
});

describe('GET /api/v1/energy-sources provider failures', () => {
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  async function expectBadGateway(route: Route): Promise<void> {
    const { app } = await createApp(route);

    const response = await supertest(app.getHttpServer()).get('/api/v1/energy-sources');

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
        ? new Response('country,iso,year,value\nA,B,2000,1\n', { status: 200 })
        : okRoutes(url),
    );
  });

  it('should answer 502 when the header lacks an expected column', async () => {
    const withoutSolar = fixture('electricity-production-by-source.csv').replace(
      'solar_generation__twh',
      'solar_output__twh',
    );

    await expectBadGateway((url) =>
      url.includes('.csv') ? new Response(withoutSolar, { status: 200 }) : okRoutes(url),
    );
  });

  it('should answer 502 when the World entity is missing', async () => {
    const withoutWorld = fixture('electricity-production-by-source.csv')
      .split('\n')
      .filter((line) => !line.includes('OWID_WRL'))
      .join('\n');

    await expectBadGateway((url) =>
      url.includes('.csv') ? new Response(withoutWorld, { status: 200 }) : okRoutes(url),
    );
  });

  it('should answer 500 when the service throws a plain Error', async () => {
    const { app } = await createApp(okRoutes, (builder) => {
      builder.overrideProvider(EnergySourcesService).useValue({
        getEnergySources: () => Promise.reject(new Error('bug')),
      });
    });

    const response = await supertest(app.getHttpServer()).get('/api/v1/energy-sources');

    expect(response.status).toBe(500);
    await app.close();
  });
});

describe('energy sources payload size', () => {
  it('should stay at or below about 55 KB gzipped for a full-size dataset', () => {
    const codes = listCountryEntityCodes();
    const years = 26;
    const columns = Object.keys(ENERGY_GENERATION_CHART.columns) as EnergyRawColumn[];
    // Deterministic pseudo-random walk per entity and source, with blanks, so the sample
    // compresses like autocorrelated real data does.
    let seed = 987654;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const generation = Object.fromEntries(
      columns.map((column) => [
        column,
        codes.map((code, entityIndex): MetricSeries => {
          // Like the real data, many country-source pairs never generate anything (a flat zero).
          const flatZero = (entityIndex * 7 + columns.indexOf(column) * 3) % 10 < 5;
          let value = 10 ** (next() * 3 - 1);
          return {
            entityCode: code,
            entityName: code === 'OWID_WRL' ? 'World' : `Country ${code}`,
            points: Array.from({ length: years }, (_, index) => {
              value = Math.max(0.01, value * (0.95 + next() * 0.1));
              const blank = (entityIndex + columns.indexOf(column)) % 5 === 0 && index < 8;
              return { year: 2000 + index, value: blank ? null : flatZero ? 0 : value };
            }),
          };
        }),
      ]),
    ) as Record<EnergyRawColumn, MetricSeries[]>;

    const { data } = buildEnergySourcesData({
      generation,
      metadata: {
        id: 1295503,
        name: 'Electricity from coal - TWh',
        unit: 'terawatt-hours',
        shortUnit: 'TWh',
        datasetName: 'Electricity mix',
        datasetVersion: '2026-06-30',
        timespan: '1900-2025',
        updatedAt: '2026-09-10T01:11:13.000Z',
        descriptionShort: null,
        entities: [],
      },
      allowedCodes: new Set(codes),
    });
    const gzipped = gzipSync(JSON.stringify(data)).length;

    expect(data.entities.length).toBeGreaterThan(190);
    expect(gzipped).toBeLessThan(55 * 1024);
  });
});
