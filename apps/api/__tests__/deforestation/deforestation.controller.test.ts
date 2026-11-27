import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import supertest from 'supertest';

import {
  ForestAreaData,
  TREE_COVER_LOSS_DRIVER_IDS,
  TreeCoverLossData,
  listCountryEntityCodes,
} from '@eco-metrics/shared';

import { SNAPSHOT_STORE } from '../../src/common/snapshots/snapshot-store';
import {
  FAO_FRA_ORIGIN,
  FOREST_AREA_SNAPSHOT_KEY,
  GFW_DRIVERS_ORIGIN,
  TREE_COVER_LOSS_SNAPSHOT_KEY,
} from '../../src/modules/deforestation/deforestation.constants';
import { ForestAreaService } from '../../src/modules/deforestation/forest-area.service';
import { OwidClient } from '../../src/modules/providers/owid/owid-client.service';
import { OWID_PUBLISHER } from '../../src/modules/providers/owid/owid.attribution';
import { StubSnapshotStore } from '../common/snapshots/stub-snapshot-store';

import {
  Route,
  createApp,
  failing,
  fixture,
  okRoutes,
  replacing,
  silenceLogger,
  useClock,
} from './helpers';

const AREA = '/api/v1/deforestation/forest-area';
const LOSS = '/api/v1/deforestation/tree-cover-loss';

const PROVIDER_ERROR_BODY = {
  success: false,
  error: 'Data provider unavailable or returned invalid data',
  status: 502,
};

describe('GET /api/v1/deforestation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    useClock('2026-11-27T12:00:00.000Z');
    ({ app } = await createApp(okRoutes));
  });

  afterAll(async () => {
    await app.close();
    jest.useRealTimers();
  });

  it('should answer forest-area with 200, World first and the OWID envelope', async () => {
    const response = await supertest(app.getHttpServer()).get(AREA);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const data = response.body.data as ForestAreaData;
    expect(data.startYear).toBe(1990);
    expect(data.endYear).toBe(2025);
    expect(data.entities[0].code).toBe('OWID_WRL');
    for (const { area, share } of data.entities) {
      expect(area).toHaveLength(36);
      expect(share).toHaveLength(36);
    }
    expect(data.origin).toEqual(FAO_FRA_ORIGIN);
    expect(data.origin.license.name).toBe('CC BY 4.0');
    expect(response.body.meta.source).toEqual({
      ...OWID_PUBLISHER,
      lastUpdated: '2026-09-10T01:11:51.000Z',
    });
    expect(response.body.meta.stale).toBe(false);
  });

  it('should answer tree-cover-loss with 200, seven drivers and the OWID envelope', async () => {
    const response = await supertest(app.getHttpServer()).get(LOSS);

    expect(response.status).toBe(200);
    const data = response.body.data as TreeCoverLossData;
    expect(data.startYear).toBe(2001);
    expect(data.entities[0].code).toBe('OWID_WRL');
    expect(data.drivers.map(({ id }) => id)).toEqual([...TREE_COVER_LOSS_DRIVER_IDS]);
    expect(data.entities[0].wildfire).toHaveLength(data.endYear - data.startYear + 1);
    expect(data.origin).toEqual(GFW_DRIVERS_ORIGIN);
    expect(data.origin.notice).toContain('Tree cover loss by dominant driver');
    expect(response.body.meta.source).toEqual({
      ...OWID_PUBLISHER,
      lastUpdated: '2026-08-12T10:24:03.000Z',
    });
  });

  it('should ignore unknown query parameters on both endpoints', async () => {
    for (const path of [AREA, LOSS]) {
      const plain = await supertest(app.getHttpServer()).get(path);
      const withQuery = await supertest(app.getHttpServer()).get(`${path}?country=ARG`);

      expect(withQuery.status).toBe(200);
      expect(withQuery.body.data).toEqual(plain.body.data);
    }
  });

  it('should list both origins under one OWID entry in the catalog', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/data-sources');

    const providers = response.body.data.providers as {
      id: string;
      categories: string[];
      origins: { producer: string; title: string; categories: string[] }[];
    }[];
    const owid = providers.filter((provider) => provider.id === 'owid');
    expect(owid).toHaveLength(1);
    expect(owid[0].categories).toEqual(expect.arrayContaining(['deforestation']));
    for (const origin of [FAO_FRA_ORIGIN, GFW_DRIVERS_ORIGIN]) {
      const listed = owid[0].origins.find(
        ({ producer, title }) => producer === origin.producer && title === origin.title,
      );
      expect(listed).toMatchObject({ ...origin, categories: ['deforestation'] });
    }
  });

  it('should keep the dependencies check at one indicator per provider', async () => {
    const response = await supertest(app.getHttpServer()).get('/api/v1/health/dependencies');

    expect(Object.keys(response.body.details)).toEqual([
      'owid',
      'copernicus-climate-pulse',
      'noaa-lsa',
    ]);
  });

  it('should document both endpoints in Swagger with their 200 and 502 responses', () => {
    const document: OpenAPIObject = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('test').build(),
    );

    for (const path of [AREA, LOSS]) {
      const operation = document.paths[path]?.get;
      expect(operation?.tags).toEqual(['Deforestation']);
      expect(Object.keys(operation?.responses ?? {})).toEqual(
        expect.arrayContaining(['200', '502']),
      );
    }
  });
});

describe('GET /api/v1/deforestation outbound requests', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should request the two forest area charts on their chart tab from 1990', async () => {
    useClock('2026-11-27T12:00:00.000Z');
    const { app, fetchStub } = await createApp(okRoutes);

    await supertest(app.getHttpServer()).get(AREA);
    await supertest(app.getHttpServer()).get(AREA);

    const urls = fetchStub.mock.calls.map(([url]) => String(url));
    expect(urls).toHaveLength(4);
    for (const slug of ['forest-area-km', 'forest-area-as-share-of-land-area']) {
      const chartUrl = urls.find((url) => url.includes(`/grapher/${slug}.csv`));
      expect(chartUrl).toBeDefined();
      const query = new URL(chartUrl ?? '').searchParams;
      expect(query.get('tab')).toBe('chart');
      expect(query.get('time')).toBe('1990..2026');
      expect(query.get('country')?.split('~')).toEqual(listCountryEntityCodes());
    }
    expect(urls.some((url) => url.endsWith('/indicators/1129226.metadata.json'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/indicators/1132530.metadata.json'))).toBe(true);
    await app.close();
  });

  it('should download the tree cover loss chart once for the seven driver columns', async () => {
    useClock('2026-11-27T12:00:00.000Z');
    const { app, fetchStub } = await createApp(okRoutes);

    await supertest(app.getHttpServer()).get(LOSS);

    const urls = fetchStub.mock.calls.map(([url]) => String(url));
    const chartUrls = urls.filter((url) => url.includes('/grapher/'));
    expect(chartUrls).toHaveLength(1);
    const query = new URL(chartUrls[0]).searchParams;
    expect(query.get('tab')).toBe('chart');
    expect(query.get('time')).toBe('2001..2026');
    expect(urls).toHaveLength(2);
    expect(urls.some((url) => url.endsWith('/indicators/1104660.metadata.json'))).toBe(true);
    await app.close();
  });

  it('should move the end of the requested range with the calendar year', async () => {
    useClock('2027-01-02T00:00:00.000Z');
    const { app, fetchStub } = await createApp(okRoutes);

    await supertest(app.getHttpServer()).get(LOSS);
    await supertest(app.getHttpServer()).get(AREA);

    const times = fetchStub.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes('/grapher/'))
      .map((url) => new URL(url).searchParams.get('time'));
    expect(times).toEqual(expect.arrayContaining(['2001..2027', '1990..2027']));
    await app.close();
  });
});

describe('GET /api/v1/deforestation provider failures', () => {
  let spies: jest.SpyInstance[];

  beforeEach(() => {
    spies = silenceLogger();
  });

  afterEach(() => {
    spies.forEach((spy) => spy.mockRestore());
  });

  async function status(route: Route, path: string): Promise<number> {
    const { app } = await createApp(route);
    const response = await supertest(app.getHttpServer()).get(path);
    if (response.status === 502) {
      expect(response.body).toEqual(PROVIDER_ERROR_BODY);
    }
    await app.close();
    return response.status;
  }

  it('should answer 502 on both endpoints when the transport fails every attempt with 503', async () => {
    const unavailable: Route = () => new Response('unavailable', { status: 503 });

    expect(await status(unavailable, AREA)).toBe(502);
    expect(await status(unavailable, LOSS)).toBe(502);
  }, 20_000);

  it('should answer 502 on forest-area when the CSV header is malformed', async () => {
    const route = replacing('forest-area-km.csv', 'country,iso,year,value\nA,B,1990,1\n');

    expect(await status(route, AREA)).toBe(502);
  });

  it('should answer 502 on tree-cover-loss when one of the seven columns is missing', async () => {
    const withoutLogging = fixture('tree-cover-loss-by-dominant-driver.csv').replace(
      'tree_cover_loss_ha__category_logging',
      'tree_cover_loss_ha__category_forestry',
    );

    expect(
      await status(replacing('tree-cover-loss-by-dominant-driver.csv', withoutLogging), LOSS),
    ).toBe(502);
  });

  it('should answer 502 on forest-area when a value column is not under its explicit short name', async () => {
    const renamedArea = fixture('forest-area-km.csv').replace('_1a_forestarea', 'forestarea');
    const renamedShare = fixture('forest-area-as-share-of-land-area.csv').replace(
      'forest_share',
      'share',
    );

    expect(await status(replacing('forest-area-km.csv', renamedArea), AREA)).toBe(502);
    expect(
      await status(replacing('forest-area-as-share-of-land-area.csv', renamedShare), AREA),
    ).toBe(502);
  });

  it('should answer 502 when the World entity is missing', async () => {
    const withoutWorld = fixture('forest-area-km.csv')
      .split('\n')
      .filter((line) => !line.includes('OWID_WRL'))
      .join('\n');

    expect(await status(replacing('forest-area-km.csv', withoutWorld), AREA)).toBe(502);
  });

  it('should answer 502 when the share chart is re-based onto another land area', async () => {
    const rebased = fixture('forest-area-as-share-of-land-area.csv')
      .split('\n')
      .map((line) => (line.startsWith('World,OWID_WRL,2025,') ? 'World,OWID_WRL,2025,40' : line))
      .join('\n');

    expect(await status(replacing('forest-area-as-share-of-land-area.csv', rebased), AREA)).toBe(
      502,
    );
  });

  it('should answer 502 when the area indicator unit is not hectares', async () => {
    const wrongUnit = fixture('indicator-1129226-metadata.json').replace(
      '"unit": "hectares"',
      '"unit": "square kilometers"',
    );

    expect(await status(replacing('/indicators/1129226', wrongUnit), AREA)).toBe(502);
  });

  it('should let forest-area answer 200 while tree-cover-loss answers 502', async () => {
    const route = replacing(
      'tree-cover-loss-by-dominant-driver.csv',
      'entity,code,year\nWorld,OWID_WRL,2001\n',
    );
    const { app } = await createApp(route);

    const area = await supertest(app.getHttpServer()).get(AREA);
    const loss = await supertest(app.getHttpServer()).get(LOSS);

    expect(area.status).toBe(200);
    expect(loss.status).toBe(502);
    expect(loss.body).toEqual(PROVIDER_ERROR_BODY);
    await app.close();
  });

  it('should let tree-cover-loss answer 200 while forest-area answers 502', async () => {
    const { app } = await createApp(failing('/grapher/forest-area-km.csv'));

    const loss = await supertest(app.getHttpServer()).get(LOSS);
    const area = await supertest(app.getHttpServer()).get(AREA);

    expect(loss.status).toBe(200);
    expect(area.status).toBe(502);
    await app.close();
  });

  it('should answer 500 when the service throws a plain Error', async () => {
    const { app } = await createApp(okRoutes, (builder) => {
      builder.overrideProvider(ForestAreaService).useValue({
        getForestArea: () => Promise.reject(new Error('bug')),
      });
    });

    const response = await supertest(app.getHttpServer()).get(AREA);

    expect(response.status).toBe(500);
    await app.close();
  });
});

describe('GET /api/v1/deforestation snapshots', () => {
  const STORED_AT = '2026-11-26T10:00:00.000Z';
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
      payload: { data: { marker }, lastUpdated: '2026-10-01T00:00:00.000Z' },
    });
  }

  function withStore(route: Route, store: StubSnapshotStore): ReturnType<typeof createApp> {
    return createApp(route, (builder) => {
      builder.overrideProvider(SNAPSHOT_STORE).useValue(store);
    });
  }

  it('should answer forest-area 200 with a stale meta when OWID is down and a snapshot exists', async () => {
    const { app } = await withStore(
      () => new Response('not found', { status: 404 }),
      seeded(FOREST_AREA_SNAPSHOT_KEY, 'stored-forest-area'),
    );

    const response = await supertest(app.getHttpServer()).get(AREA);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ marker: 'stored-forest-area' });
    expect(response.body.meta.stale).toBe(true);
    expect(response.body.meta.fetchedAt).toBe(STORED_AT);
    await app.close();
  });

  it('should answer tree-cover-loss 200 with a stale meta when OWID is down and a snapshot exists', async () => {
    const { app } = await withStore(
      () => new Response('not found', { status: 404 }),
      seeded(TREE_COVER_LOSS_SNAPSHOT_KEY, 'stored-tree-cover-loss'),
    );

    const response = await supertest(app.getHttpServer()).get(LOSS);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ marker: 'stored-tree-cover-loss' });
    expect(response.body.meta.stale).toBe(true);
    expect(response.body.meta.fetchedAt).toBe(STORED_AT);
    await app.close();
  });

  it('should not serve one endpoint the snapshot of the other', async () => {
    const { app } = await withStore(
      () => new Response('not found', { status: 404 }),
      seeded(FOREST_AREA_SNAPSHOT_KEY, 'stored-forest-area'),
    );

    const response = await supertest(app.getHttpServer()).get(LOSS);

    expect(response.status).toBe(502);
    expect(response.body).toEqual(PROVIDER_ERROR_BODY);
    await app.close();
  });

  it('should answer 502 on both endpoints when OWID is down and nothing is stored', async () => {
    const { app } = await withStore(
      () => new Response('not found', { status: 404 }),
      new StubSnapshotStore(),
    );

    const area = await supertest(app.getHttpServer()).get(AREA);
    const loss = await supertest(app.getHttpServer()).get(LOSS);

    expect(area.status).toBe(502);
    expect(area.body).toEqual(PROVIDER_ERROR_BODY);
    expect(loss.status).toBe(502);
    expect(loss.body).toEqual(PROVIDER_ERROR_BODY);
    await app.close();
  });

  it('should store the two payloads under distinct snapshot keys', async () => {
    const store = new StubSnapshotStore();
    const { app } = await withStore(okRoutes, store);

    const area = await supertest(app.getHttpServer()).get(AREA);
    const loss = await supertest(app.getHttpServer()).get(LOSS);

    const storedArea = store.stored(FOREST_AREA_SNAPSHOT_KEY) as
      { payload: { data: unknown } } | undefined;
    const storedLoss = store.stored(TREE_COVER_LOSS_SNAPSHOT_KEY) as
      { payload: { data: unknown } } | undefined;
    expect(FOREST_AREA_SNAPSHOT_KEY).not.toBe(TREE_COVER_LOSS_SNAPSHOT_KEY);
    expect(storedArea?.payload.data).toEqual(area.body.data);
    expect(storedLoss?.payload.data).toEqual(loss.body.data);
    await app.close();
  });

  it('should answer 200 with fresh data when the store rejects every call', async () => {
    const { app } = await withStore(okRoutes, new StubSnapshotStore().failEverything());

    const response = await supertest(app.getHttpServer()).get(AREA);

    expect(response.status).toBe(200);
    expect(response.body.meta.stale).toBe(false);
    await app.close();
  });

  it('should keep a plain Error as 500 even when a snapshot is stored', async () => {
    const store = seeded(TREE_COVER_LOSS_SNAPSHOT_KEY, 'stored-tree-cover-loss');
    const { app } = await createApp(okRoutes, (builder) => {
      builder.overrideProvider(SNAPSHOT_STORE).useValue(store);
      builder.overrideProvider(OwidClient).useValue({
        getGrapherSeries: () => Promise.reject(new TypeError('bug')),
        getIndicatorMetadata: () => Promise.reject(new TypeError('bug')),
      });
    });

    const response = await supertest(app.getHttpServer()).get(LOSS);

    expect(response.status).toBe(500);
    expect(store.count('read')).toBe(0);
    await app.close();
  });
});
