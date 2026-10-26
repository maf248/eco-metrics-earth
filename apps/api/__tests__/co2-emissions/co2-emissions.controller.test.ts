import { readFileSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

import { INestApplication, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import supertest from 'supertest';

import { Co2EmissionsData, iso2ForEntityCode, listCountryEntityCodes } from '@eco-metrics/shared';

import { AppModule } from '../../src/app/app.module';
import { applyGlobalPipeline } from '../../src/app/global-pipeline';
import { OUTBOUND_FETCH } from '../../src/common/http/outbound-http-client.service';
import { AppConfigModule } from '../../src/config/app-config.module';
import { DataSourcesModule } from '../../src/modules/data-sources/data-sources.module';
import { OWID_PUBLISHER } from '../../src/modules/providers/owid/owid.attribution';
import { OwidModule } from '../../src/modules/providers/owid/owid.module';

const FIXTURES = join(__dirname, 'fixtures');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

type Route = (url: string) => Response;

const okRoutes: Route = (url) => {
  if (url.includes('/grapher/annual-co2-emissions-per-country.csv')) {
    return new Response(fixture('annual-co2-emissions-per-country.csv'), { status: 200 });
  }
  if (url.includes('/grapher/co-emissions-per-capita.csv')) {
    return new Response(fixture('co-emissions-per-capita.csv'), { status: 200 });
  }
  if (url.includes('/indicators/1119906.metadata.json')) {
    return new Response(fixture('indicator-1119906-metadata.json'), { status: 200 });
  }
  if (url.includes('/indicators/1119914.metadata.json')) {
    return new Response(fixture('indicator-1119914-metadata.json'), { status: 200 });
  }
  return new Response('not found', { status: 404 });
};

async function createApp(route: Route): Promise<{
  app: INestApplication;
  fetchStub: jest.Mock;
}> {
  const fetchStub = jest.fn((input: string | URL) => Promise.resolve(route(String(input))));
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(OUTBOUND_FETCH)
    .useValue(fetchStub)
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  applyGlobalPipeline(app);
  await app.init();
  return { app, fetchStub };
}

describe('GET /api/v1/co2-emissions', () => {
  let app: INestApplication;
  let fetchStub: jest.Mock;

  beforeAll(async () => {
    ({ app, fetchStub } = await createApp(okRoutes));
  });

  afterAll(async () => {
    await app.close();
  });

  it('should answer 200 with the envelope, World first and the fixture countries', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/co2-emissions');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe(200);
    const data = response.body.data as Co2EmissionsData;
    expect(data.startYear).toBe(1950);
    expect(data.endYear).toBe(1995);
    expect(data.entities[0].code).toBe('OWID_WRL');
    expect(data.entities.map((e) => e.code)).toEqual(
      expect.arrayContaining(['ARG', 'USA', 'OWID_KOS', 'ATA']),
    );
  });

  it('should attach the publisher, provider timestamp and fetch time as meta', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/co2-emissions');

    expect(response.body.meta.source).toEqual({
      ...OWID_PUBLISHER,
      lastUpdated: '2026-10-22T21:47:04.000Z',
    });
    expect(new Date(response.body.meta.fetchedAt).toISOString()).toBe(response.body.meta.fetchedAt);
    expect(response.body.data.dataset).toEqual({
      name: 'Global Carbon Budget',
      version: '2025-11-13',
    });
  });

  it('should request the explicit allowlist from 1950 for both charts', async () => {
    await supertest(app.getHttpServer()).get('/api/v1/co2-emissions');

    const urls = fetchStub.mock.calls.map(([url]) => String(url));
    const chartUrls = urls.filter((url) => url.includes('/grapher/'));
    expect(chartUrls.length).toBeGreaterThanOrEqual(2);
    for (const url of chartUrls) {
      const query = new URL(url).searchParams;
      expect(query.get('country')?.split('~')).toEqual(listCountryEntityCodes());
      expect(query.get('time')).toMatch(/^1950\.\.\d{4}$/);
    }
    expect(urls.some((url) => url.includes('annual-co2-emissions-per-country.csv'))).toBe(true);
    expect(urls.some((url) => url.includes('co-emissions-per-capita.csv'))).toBe(true);
  });

  it('should ignore unknown query parameters', async () => {
    const plain = await supertest(app.getHttpServer()).get('/api/v1/co2-emissions');
    const withQuery = await supertest(app.getHttpServer()).get('/api/v1/co2-emissions?country=ARG');

    expect(withQuery.status).toBe(200);
    expect(withQuery.body.data).toEqual(plain.body.data);
  });

  it('should carry the Global Carbon Project origin in the payload', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/co2-emissions');

    expect(response.body.data.origin).toEqual({
      producer: 'Global Carbon Project',
      title: 'Global Carbon Budget',
      url: 'https://globalcarbonbudget.org/',
      license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    });
  });

  it('should list the same origin in the catalog for co2-emissions', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/data-sources');

    const owid = response.body.data.providers.find((p: { id: string }) => p.id === 'owid');
    expect(owid.origins).toContainEqual(
      expect.objectContaining({
        producer: 'Global Carbon Project',
        license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
        categories: ['co2-emissions'],
      }),
    );
  });

  it('should list OWID in the catalog with the co2-emissions category', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/data-sources');

    const owid = response.body.data.providers.find((p: { id: string }) => p.id === 'owid');
    expect(owid.categories).toContain('co2-emissions');
  });

  it('should document the endpoint in Swagger with its 200 and 502 responses', () => {
    const document: OpenAPIObject = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('test').build(),
    );

    const operation = document.paths['/api/v1/co2-emissions']?.get;
    expect(operation?.tags).toEqual(['CO2 Emissions']);
    expect(Object.keys(operation?.responses ?? {})).toEqual(expect.arrayContaining(['200', '502']));
  });
});

describe('GET /api/v1/co2-emissions provider failures', () => {
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('should answer 502 when the transport fails every attempt with 503', async () => {
    const { app } = await createApp(() => new Response('unavailable', { status: 503 }));

    const response = await supertest(app.getHttpServer()).get('/api/v1/co2-emissions');

    expect(response.status).toBe(502);
    expect(response.body.success).toBe(false);
    expect(response.body).not.toHaveProperty('data');
    await app.close();
  }, 15_000);

  it('should answer 502 when the CSV header is malformed', async () => {
    const { app } = await createApp((url) =>
      url.includes('.csv')
        ? new Response('country,iso,year,value\nA,B,1950,1\n', { status: 200 })
        : okRoutes(url),
    );

    const response = await supertest(app.getHttpServer()).get('/api/v1/co2-emissions');

    expect(response.status).toBe(502);
    await app.close();
  });

  it('should answer 502 when the World entity is missing', async () => {
    const withoutWorld = (name: string): string =>
      fixture(name)
        .split('\n')
        .filter((line) => !line.includes('OWID_WRL'))
        .join('\n');
    const { app } = await createApp((url) => {
      if (url.includes('annual-co2-emissions-per-country.csv')) {
        return new Response(withoutWorld('annual-co2-emissions-per-country.csv'), { status: 200 });
      }
      if (url.includes('co-emissions-per-capita.csv')) {
        return new Response(withoutWorld('co-emissions-per-capita.csv'), { status: 200 });
      }
      return okRoutes(url);
    });

    const response = await supertest(app.getHttpServer()).get('/api/v1/co2-emissions');

    expect(response.status).toBe(502);
    expect(response.body).not.toHaveProperty('data');
    await app.close();
  });
});

describe('co2-emissions fixtures and catalog wiring', () => {
  it('should cover World, Kosovo, a null per-capita entity, an aggregate and both metadata captures', () => {
    const totals = fixture('annual-co2-emissions-per-country.csv');
    const perCapita = fixture('co-emissions-per-capita.csv');

    expect(totals).toMatch(/OWID_WRL/);
    expect(totals).toMatch(/OWID_KOS/);
    expect(totals).toMatch(/OWID_EUR/);
    expect(perCapita).not.toMatch(/ATA/);
    expect(totals).toMatch(/ATA/);
    expect(fixture('indicator-1119906-metadata.json')).toMatch(/Global Carbon Budget/);
    expect(fixture('indicator-1119914-metadata.json')).toMatch(/Global Carbon Budget/);
  });

  it('should map every non-aggregate fixture code to an alpha-2 code except World', () => {
    const codes = new Set<string>();
    for (const name of ['annual-co2-emissions-per-country.csv', 'co-emissions-per-capita.csv']) {
      for (const line of fixture(name).split('\n').slice(1)) {
        const code = line.split(',')[1];
        if (code && /^[A-Z]{3}$|^OWID_(WRL|KOS)$/.test(code)) codes.add(code);
      }
    }

    expect(codes.has('OWID_WRL')).toBe(true);
    const unmapped = [...codes].filter(
      (code) => code !== 'OWID_WRL' && iso2ForEntityCode(code) === null,
    );
    expect(unmapped).toEqual([]);
  });

  it('should drop the owid catalog entry when the co2 module is not part of the application', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AppConfigModule,
        OwidModule,
        DataSourcesModule,
      ],
    }).compile();
    const app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    applyGlobalPipeline(app);
    await app.init();

    try {
      const response = await supertest(app.getHttpServer()).get('/api/v1/data-sources');
      expect(response.status).toBe(200);
      const providers = response.body.data.providers as { id: string }[];
      expect(providers.some((p) => p.id === 'owid')).toBe(false);
    } finally {
      await app.close();
    }
  });
});

describe('payload size', () => {
  it('should stay at or below about 80 KB gzipped for a full-size dataset', () => {
    const years = 75;
    // Deterministic smooth random walk (a few percent per year), like real emissions series.
    let seed = 7;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    // Many real series start late (new states, small territories) and magnitudes span
    // several orders of magnitude, so start values are log-uniform and some are null.
    const walk = (start: number, decimals: number, leadingNulls: number): (number | null)[] => {
      const factor = 10 ** decimals;
      let value = start;
      return Array.from({ length: years }, (_, year) => {
        value *= 1 + (next() - 0.4) * 0.06;
        return year < leadingNulls ? null : Math.round(value * factor) / factor;
      });
    };
    const entities = Array.from({ length: 217 }, (_, i) => {
      const leadingNulls = next() < 0.35 ? 30 + Math.floor(next() * 10) : 0;
      return {
        code: `C${String(i).padStart(3, '0')}`,
        iso2: 'XX',
        name: `Country number ${i}`,
        total: walk(10 ** (next() * 5 - 2), 3, leadingNulls),
        perCapita: walk(10 ** (next() * 2.5 - 1), 2, leadingNulls),
      };
    });

    const gzipped = gzipSync(JSON.stringify({ entities })).length;

    expect(gzipped).toBeLessThanOrEqual(80_000);
  });
});
