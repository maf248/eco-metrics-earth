import { getCo2Emissions } from '@/lib/co2Emissions';

import { CO2_FIXTURE, CO2_META } from '../fixtures/co2Emissions';

describe('getCo2Emissions', () => {
  const originalFetch = global.fetch;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const respondWith = (payload: unknown): jest.Mock => {
    const fetchMock = jest.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => payload,
    }));
    global.fetch = fetchMock as unknown as typeof global.fetch;
    return fetchMock;
  };

  const envelope = (data: unknown) => ({ success: true, status: 200, data, meta: CO2_META });

  it('should resolve with the data and the attribution meta', async () => {
    const fetchMock = respondWith(envelope(CO2_FIXTURE));

    const result = await getCo2Emissions();

    expect(result.data).toEqual(CO2_FIXTURE);
    expect(result.meta.source.provider).toBe('Our World in Data');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe('/api/v1/co2-emissions');
  });

  it.each([
    [
      'an entity with misaligned arrays',
      {
        ...CO2_FIXTURE,
        entities: [
          ...CO2_FIXTURE.entities,
          { code: 'FRA', iso2: 'FR', name: 'France', total: [1, 2], perCapita: [1, 2] },
        ],
      },
    ],
    ['no World entity', { ...CO2_FIXTURE, entities: CO2_FIXTURE.entities.slice(1) }],
    ['no entities', { ...CO2_FIXTURE, entities: [] }],
    ['missing units', { ...CO2_FIXTURE, units: undefined }],
    ['missing dataset', { ...CO2_FIXTURE, dataset: { name: 'x' } }],
    ['an inverted year range', { ...CO2_FIXTURE, endYear: 2000 }],
    ['a non-object payload', 'nope'],
    [
      'a non-numeric value',
      {
        ...CO2_FIXTURE,
        entities: [{ ...CO2_FIXTURE.entities[0], total: ['a', 1, 2, 3, 4] }],
      },
    ],
    ['an invalid iso2', { ...CO2_FIXTURE, entities: [{ ...CO2_FIXTURE.entities[0], iso2: 5 }] }],
  ])('should reject %s', async (_label, data) => {
    respondWith(envelope(data));

    await expect(getCo2Emissions()).rejects.toThrow(
      'CO2 emissions data could not be fetched from the BFF',
    );
  });

  it('should reject a response without meta', async () => {
    respondWith({ success: true, status: 200, data: CO2_FIXTURE });

    await expect(getCo2Emissions()).rejects.toThrow(
      'CO2 emissions data could not be fetched from the BFF',
    );
  });

  it('should make exactly two attempts, log once and throw when the BFF answers 502', async () => {
    const fetchMock = jest.fn().mockImplementation(async () => ({
      ok: false,
      status: 502,
      json: async () => ({ success: false, error: 'Data provider unavailable', status: 502 }),
    }));
    global.fetch = fetchMock as unknown as typeof global.fetch;

    await expect(getCo2Emissions()).rejects.toThrow(
      'CO2 emissions data could not be fetched from the BFF',
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});
