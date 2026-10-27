import { getEnergySources } from '@/lib/energySources';

import { ENERGY_FIXTURE, ENERGY_META } from '../fixtures/energySources';

const FAILURE = 'Energy sources data could not be fetched from the BFF';

describe('getEnergySources', () => {
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

  const envelope = (data: unknown) => ({ success: true, status: 200, data, meta: ENERGY_META });

  it('should resolve with the data and the attribution meta after one request', async () => {
    const fetchMock = respondWith(envelope(ENERGY_FIXTURE));

    const result = await getEnergySources();

    expect(result.data).toEqual(ENERGY_FIXTURE);
    expect(result.meta.source.provider).toBe('Our World in Data');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe('/api/v1/energy-sources');
  });

  const [world, ...others] = ENERGY_FIXTURE.entities;

  it.each([
    [
      'a misaligned array',
      {
        ...ENERGY_FIXTURE,
        entities: [{ ...world, generation: { ...world.generation, coal: [1, 2] } }, ...others],
      },
    ],
    [
      'a missing source key',
      {
        ...ENERGY_FIXTURE,
        entities: [
          {
            ...world,
            generation: { ...world.generation, solar: undefined },
          },
          ...others,
        ],
      },
    ],
    [
      'an entity without generation',
      { ...ENERGY_FIXTURE, entities: [{ ...world, generation: undefined }] },
    ],
    ['no World entity', { ...ENERGY_FIXTURE, entities: others }],
    ['a missing origin', { ...ENERGY_FIXTURE, origin: undefined }],
    ['a non-string unit', { ...ENERGY_FIXTURE, unit: 12 }],
    ['a missing dataset', { ...ENERGY_FIXTURE, dataset: { name: 'x' } }],
    ['a non-object payload', 'nope'],
  ])('should reject %s', async (_label, data) => {
    respondWith(envelope(data));

    await expect(getEnergySources()).rejects.toThrow(FAILURE);
  });

  it('should not require shares in the payload', async () => {
    respondWith(envelope(ENERGY_FIXTURE));

    await expect(getEnergySources()).resolves.toBeDefined();
    expect(JSON.stringify(ENERGY_FIXTURE)).not.toContain('share');
  });

  it('should make exactly two attempts, log once and throw when the BFF answers 502', async () => {
    const fetchMock = jest.fn().mockImplementation(async () => ({
      ok: false,
      status: 502,
      json: async () => ({ success: false, error: 'Data provider unavailable', status: 502 }),
    }));
    global.fetch = fetchMock as unknown as typeof global.fetch;

    await expect(getEnergySources()).rejects.toThrow(FAILURE);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});
