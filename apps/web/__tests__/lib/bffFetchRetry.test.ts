import { fetchEnvelopeFromBff } from '@/lib/bffFetch';

const isNumberList = (data: unknown): data is number[] =>
  Array.isArray(data) && data.every((item) => typeof item === 'number');

const META = {
  source: {
    provider: 'Our World in Data',
    license: 'CC BY 4.0',
    sourceUrl: 'https://ourworldindata.org',
    lastUpdated: '2026-10-22T21:47:04.000Z',
  },
  fetchedAt: '2026-10-24T00:00:00.000Z',
};

const request = () =>
  fetchEnvelopeFromBff({
    path: '/things',
    label: 'Things',
    isData: isNumberList,
    requireMeta: true,
  });

const ok = (json: unknown) => ({ ok: true, status: 200, json: async () => json });

describe('fetchEnvelopeFromBff retry and the Data Cache', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const useFetch = (...responses: unknown[]): jest.Mock => {
    const fetchMock = jest.fn();
    responses.forEach((response) => fetchMock.mockResolvedValueOnce(response));
    global.fetch = fetchMock as unknown as typeof global.fetch;
    return fetchMock;
  };

  const initOf = (fetchMock: jest.Mock, call: number): Record<string, unknown> =>
    fetchMock.mock.calls[call][1] as Record<string, unknown>;

  it('should read through the Data Cache on the first attempt', async () => {
    const fetchMock = useFetch(ok({ success: true, data: [1], meta: META }));

    await request();

    expect(initOf(fetchMock, 0)).toMatchObject({ next: { revalidate: 86400 } });
    expect(initOf(fetchMock, 0)).not.toHaveProperty('cache');
  });

  it('should bypass the Data Cache on the retry after a stale-shaped response and succeed', async () => {
    const fetchMock = useFetch(
      ok({ success: true, data: ['stale'], meta: META }),
      ok({ success: true, data: [1, 2], meta: META }),
    );

    await expect(request()).resolves.toEqual({ data: [1, 2], meta: META });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(initOf(fetchMock, 1)).toMatchObject({ cache: 'no-store' });
    expect(initOf(fetchMock, 1)).not.toHaveProperty('next');
  });

  it('should keep the regular revalidation on the retry after a provider 502 for non-provider reads', async () => {
    const fetchMock = useFetch(
      {
        ok: false,
        status: 502,
        json: async () => ({ success: false, error: 'Data provider unavailable', status: 502 }),
      },
      ok({ success: true, data: [1], meta: META }),
    );

    await request();

    expect(initOf(fetchMock, 1)).toMatchObject({ next: { revalidate: 86400 } });
  });

  it('should bypass the Data Cache after a response without the required meta', async () => {
    const fetchMock = useFetch(
      ok({ success: true, data: [1] }),
      ok({ success: true, data: [1], meta: META }),
    );

    await request();

    expect(initOf(fetchMock, 1)).toMatchObject({ cache: 'no-store' });
  });

  it('should keep the Data Cache on the retry after an HTTP error', async () => {
    const fetchMock = useFetch(
      { ok: false, status: 503, json: async () => ({}) },
      ok({ success: true, data: [1], meta: META }),
    );

    await request();

    expect(initOf(fetchMock, 1)).toMatchObject({ next: { revalidate: 86400 } });
    expect(initOf(fetchMock, 1)).not.toHaveProperty('cache');
  });

  it('should keep the Data Cache on the retry after a network error', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(ok({ success: true, data: [1], meta: META }));
    global.fetch = fetchMock as unknown as typeof global.fetch;

    await request();

    expect(initOf(fetchMock, 1)).toMatchObject({ next: { revalidate: 86400 } });
  });

  it('should still throw after two shape failures, bypassing the cache on the second', async () => {
    const fetchMock = useFetch(
      ok({ success: true, data: ['stale'], meta: META }),
      ok({ success: true, data: ['stale'], meta: META }),
    );

    await expect(request()).rejects.toThrow('Things could not be fetched from the BFF');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(initOf(fetchMock, 1)).toMatchObject({ cache: 'no-store' });
  });
});
