import { getForestArea, getTreeCoverLoss } from '@/lib/deforestation';

import {
  DEFORESTATION_META,
  FOREST_FIXTURE,
  TREE_COVER_LOSS_FIXTURE,
} from '../fixtures/deforestation';

describe('deforestation reads', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const respondWith = (data: unknown): jest.Mock => {
    const fetchMock = jest.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, status: 200, data, meta: DEFORESTATION_META }),
    }));
    global.fetch = fetchMock as unknown as typeof global.fetch;
    return fetchMock;
  };

  it('should read the forest area endpoint and return data with its meta', async () => {
    const fetchMock = respondWith(FOREST_FIXTURE);

    const result = await getForestArea();

    if (result.kind !== 'ok') throw new Error('expected an ok result');
    expect(result.payload.data).toEqual(FOREST_FIXTURE);
    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe(
      '/api/v1/deforestation/forest-area',
    );
  });

  it('should read the tree cover loss endpoint and return data with its meta', async () => {
    const fetchMock = respondWith(TREE_COVER_LOSS_FIXTURE);

    const result = await getTreeCoverLoss();

    if (result.kind !== 'ok') throw new Error('expected an ok result');
    expect(result.payload.data.drivers).toHaveLength(7);
    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe(
      '/api/v1/deforestation/tree-cover-loss',
    );
  });

  it.each([
    [
      'an area array of the wrong length',
      { ...FOREST_FIXTURE, entities: [{ ...FOREST_FIXTURE.entities[0], area: [1] }] },
    ],
    ['no World entity', { ...FOREST_FIXTURE, entities: FOREST_FIXTURE.entities.slice(1) }],
    ['missing units', { ...FOREST_FIXTURE, units: undefined }],
    ['missing dataset', { ...FOREST_FIXTURE, dataset: { name: 'x' } }],
    [
      'an origin without a notice',
      { ...FOREST_FIXTURE, origin: { ...FOREST_FIXTURE.origin, notice: undefined } },
    ],
    ['a missing origin', { ...FOREST_FIXTURE, origin: undefined }],
  ])('should reject a forest area payload with %s', async (_label, data) => {
    respondWith(data);

    await expect(getForestArea()).rejects.toThrow('Forest area data could not be fetched');
  });

  it.each([
    [
      'a missing driver array',
      {
        ...TREE_COVER_LOSS_FIXTURE,
        entities: [{ ...TREE_COVER_LOSS_FIXTURE.entities[0], logging: undefined }],
      },
    ],
    [
      'drivers out of order',
      { ...TREE_COVER_LOSS_FIXTURE, drivers: [...TREE_COVER_LOSS_FIXTURE.drivers].reverse() },
    ],
    [
      'only six drivers',
      { ...TREE_COVER_LOSS_FIXTURE, drivers: TREE_COVER_LOSS_FIXTURE.drivers.slice(1) },
    ],
    [
      'a driver without a name',
      {
        ...TREE_COVER_LOSS_FIXTURE,
        drivers: TREE_COVER_LOSS_FIXTURE.drivers.map((driver, index) =>
          index === 0 ? { id: driver.id } : driver,
        ),
      },
    ],
    ['a missing unit', { ...TREE_COVER_LOSS_FIXTURE, unit: undefined }],
    ['a missing origin', { ...TREE_COVER_LOSS_FIXTURE, origin: undefined }],
  ])('should reject a tree cover loss payload with %s', async (_label, data) => {
    respondWith(data);

    await expect(getTreeCoverLoss()).rejects.toThrow('Tree cover loss data could not be fetched');
  });

  it('should resolve provider-unavailable for a provider 502 on either endpoint', async () => {
    global.fetch = jest.fn().mockImplementation(async () => ({
      ok: false,
      status: 502,
      json: async () => ({ success: false, error: 'Data provider unavailable', status: 502 }),
    })) as unknown as typeof global.fetch;

    await expect(getForestArea()).resolves.toEqual({ kind: 'provider-unavailable' });
    await expect(getTreeCoverLoss()).resolves.toEqual({ kind: 'provider-unavailable' });
  });
});
