import { getGlobalTemperature } from '@/lib/globalTemperature';

import { TEMPERATURE_FIXTURE, TEMPERATURE_META } from '../fixtures/globalTemperature';

const FAILURE = 'Global temperature data could not be fetched from the BFF';

describe('getGlobalTemperature', () => {
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

  const envelope = (data: unknown) => ({
    success: true,
    status: 200,
    data,
    meta: TEMPERATURE_META,
  });

  it('should resolve with the data and the attribution meta after one request', async () => {
    const fetchMock = respondWith(envelope(TEMPERATURE_FIXTURE));

    const result = await getGlobalTemperature();

    expect(result.data).toEqual(TEMPERATURE_FIXTURE);
    expect(result.meta.source.provider).toBe('Our World in Data');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe(
      '/api/v1/global-temperature',
    );
  });

  it.each([
    [
      'an entity with misaligned arrays',
      {
        ...TEMPERATURE_FIXTURE,
        entities: [
          ...TEMPERATURE_FIXTURE.entities,
          { code: 'FRA', iso2: 'FR', name: 'France', anomaly: [1, 2] },
        ],
      },
    ],
    [
      'no World entity',
      { ...TEMPERATURE_FIXTURE, entities: TEMPERATURE_FIXTURE.entities.slice(1) },
    ],
    ['a missing baseline', { ...TEMPERATURE_FIXTURE, baseline: undefined }],
    [
      'an inverted baseline',
      { ...TEMPERATURE_FIXTURE, baseline: { startYear: 2020, endYear: 1991 } },
    ],
    ['a missing unit', { ...TEMPERATURE_FIXTURE, unit: undefined }],
    ['a missing dataset', { ...TEMPERATURE_FIXTURE, dataset: { name: 'x' } }],
    ['a missing origin', { ...TEMPERATURE_FIXTURE, origin: undefined }],
    [
      'an origin without its license notice',
      { ...TEMPERATURE_FIXTURE, origin: { ...TEMPERATURE_FIXTURE.origin, notice: undefined } },
    ],
    [
      'a global series origin without its license notice',
      {
        ...TEMPERATURE_FIXTURE,
        global: {
          ...TEMPERATURE_FIXTURE.global,
          origin: { ...TEMPERATURE_FIXTURE.global.origin, notice: undefined },
        },
      },
    ],
    [
      'an origin without a license',
      { ...TEMPERATURE_FIXTURE, origin: { ...TEMPERATURE_FIXTURE.origin, license: undefined } },
    ],
    ['a missing global series', { ...TEMPERATURE_FIXTURE, global: undefined }],
    [
      'a misaligned global series',
      { ...TEMPERATURE_FIXTURE, global: { ...TEMPERATURE_FIXTURE.global, lower: [1] } },
    ],
    [
      'a global series without an origin',
      { ...TEMPERATURE_FIXTURE, global: { ...TEMPERATURE_FIXTURE.global, origin: 'x' } },
    ],
    ['a non-object payload', 'nope'],
  ])('should reject %s', async (_label, data) => {
    respondWith(envelope(data));

    await expect(getGlobalTemperature()).rejects.toThrow(FAILURE);
  });

  it('should reject a response without meta', async () => {
    respondWith({ success: true, status: 200, data: TEMPERATURE_FIXTURE });

    await expect(getGlobalTemperature()).rejects.toThrow(FAILURE);
  });

  it('should make exactly two attempts, log once and throw when the BFF answers 502', async () => {
    const fetchMock = jest.fn().mockImplementation(async () => ({
      ok: false,
      status: 502,
      json: async () => ({ success: false, error: 'Data provider unavailable', status: 502 }),
    }));
    global.fetch = fetchMock as unknown as typeof global.fetch;

    await expect(getGlobalTemperature()).rejects.toThrow(FAILURE);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});
