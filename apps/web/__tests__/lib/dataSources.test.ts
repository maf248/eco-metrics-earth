import { getDataSources } from '@/lib/dataSources';

describe('getDataSources', () => {
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
      json: async () => ({ success: true, data, status: 200 }),
    }));
    global.fetch = fetchMock as unknown as typeof global.fetch;
    return fetchMock;
  };

  it('should resolve with a valid catalog from the data-sources endpoint', async () => {
    const catalog = { providers: [], datasets: [] };
    const fetchMock = respondWith(catalog);

    await expect(getDataSources()).resolves.toEqual(catalog);

    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe('/api/v1/data-sources');
  });

  it.each([
    ['an array', []],
    ['null', null],
    ['an object missing datasets', { providers: [] }],
    ['an object with non-array providers', { providers: {}, datasets: [] }],
  ])('should throw when the data is %s', async (_label, data) => {
    respondWith(data);

    await expect(getDataSources()).rejects.toThrow(
      'Data sources could not be fetched from the BFF',
    );
  });
});
