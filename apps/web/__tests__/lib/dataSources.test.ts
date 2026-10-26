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

  const origin = {
    producer: 'Global Carbon Project',
    title: 'Global Carbon Budget',
    url: 'https://globalcarbonbudget.org/',
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    categories: ['co2-emissions'],
  };
  const catalogWith = (origins: unknown) => ({
    providers: [{ id: 'owid', categories: ['co2-emissions'], origins }],
    datasets: [],
  });

  it('should accept providers with valid origins, with and without optional texts', async () => {
    const catalog = catalogWith([
      origin,
      { ...origin, notice: 'n', citation: 'c', disclaimer: 'd' },
    ]);
    respondWith(catalog);

    await expect(getDataSources()).resolves.toEqual(catalog);
  });

  it('should accept a provider with an empty origins list', async () => {
    const catalog = catalogWith([]);
    respondWith(catalog);

    await expect(getDataSources()).resolves.toEqual(catalog);
  });

  it.each([
    ['no origins property (a stale cached catalog)', undefined],
    ['non-array origins', {}],
    ['an origin without a license url', [{ ...origin, license: { name: 'x' } }]],
    ['an origin with an unknown category', [{ ...origin, categories: ['nope'] }]],
    ['an origin without categories', [{ ...origin, categories: undefined }]],
    ['a non-object origin', ['x']],
  ])('should reject a provider with %s', async (_label, origins) => {
    respondWith(catalogWith(origins));

    await expect(getDataSources()).rejects.toThrow(
      'Data sources could not be fetched from the BFF',
    );
  });

  it('should reject a non-object provider', async () => {
    respondWith({ providers: ['x'], datasets: [] });

    await expect(getDataSources()).rejects.toThrow(
      'Data sources could not be fetched from the BFF',
    );
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
