import { DEGRADED_REVALIDATE_SECONDS, fetchProviderPayloadFromBff } from '@/lib/bffFetch';

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
  fetchProviderPayloadFromBff({ path: '/things', label: 'Things', isData: isNumberList });

const ok = (json: unknown) => ({ ok: true, status: 200, json: async () => json });
const providerBadGateway = () => ({
  ok: false,
  status: 502,
  json: async () => ({ success: false, error: 'Data provider unavailable', status: 502 }),
});
const htmlBadGateway = () => ({
  ok: false,
  status: 502,
  json: async () => {
    throw new SyntaxError('Unexpected token <');
  },
});

describe('fetchProviderPayloadFromBff', () => {
  const originalFetch = global.fetch;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
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

  it('should return the payload with its meta on success', async () => {
    useFetch(ok({ success: true, data: [1, 2], meta: META }));

    await expect(request()).resolves.toEqual({
      kind: 'ok',
      payload: { data: [1, 2], meta: META },
    });
  });

  it('should return provider-unavailable after two provider 502 answers, logging one error', async () => {
    const fetchMock = useFetch(providerBadGateway(), providerBadGateway());

    await expect(request()).resolves.toEqual({ kind: 'provider-unavailable' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('should request the retry after a provider 502 with the short revalidation', async () => {
    const fetchMock = useFetch(providerBadGateway(), providerBadGateway());

    await request();

    expect(DEGRADED_REVALIDATE_SECONDS).toBe(300);
    expect(initOf(fetchMock, 0)).toMatchObject({ next: { revalidate: 86400 } });
    expect(initOf(fetchMock, 1)).toMatchObject({ next: { revalidate: 300 } });
  });

  it('should return ok when the retry after a provider 502 succeeds', async () => {
    useFetch(providerBadGateway(), ok({ success: true, data: [1], meta: META }));

    await expect(request()).resolves.toMatchObject({ kind: 'ok' });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should accept a stale meta', async () => {
    useFetch(ok({ success: true, data: [1], meta: { ...META, stale: true } }));

    const result = await request();

    expect(result.kind === 'ok' && result.payload.meta.stale).toBe(true);
  });

  it('should accept an explicit fresh flag', async () => {
    useFetch(ok({ success: true, data: [1], meta: { ...META, stale: false } }));

    await expect(request()).resolves.toMatchObject({ kind: 'ok' });
  });

  it('should treat a non-boolean stale flag as a shape mismatch and throw after the retry', async () => {
    const fetchMock = useFetch(
      ok({ success: true, data: [1], meta: { ...META, stale: 'yes' } }),
      ok({ success: true, data: [1], meta: { ...META, stale: 'yes' } }),
    );

    await expect(request()).rejects.toThrow('Things could not be fetched from the BFF');

    expect(initOf(fetchMock, 1)).toMatchObject({ cache: 'no-store' });
  });

  it('should throw when the response carries no meta', async () => {
    useFetch(ok({ success: true, data: [1] }), ok({ success: true, data: [1] }));

    await expect(request()).rejects.toThrow('Things could not be fetched from the BFF');
  });

  it.each<[string, () => Promise<unknown>]>([
    ['an unreachable BFF', () => Promise.reject(new TypeError('fetch failed'))],
    [
      'a 503',
      () => Promise.resolve({ ok: false, status: 503, json: async () => ({ success: false }) }),
    ],
    ['an HTML 502', () => Promise.resolve(htmlBadGateway())],
    [
      'a 502 with an unrelated JSON body',
      () => Promise.resolve({ ok: false, status: 502, json: async () => ({ error: 'x' }) }),
    ],
    [
      'a 502 with a null body',
      () => Promise.resolve({ ok: false, status: 502, json: async () => null }),
    ],
    [
      'a 500 that carries the provider body',
      () =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ success: false, status: 502 }),
        }),
    ],
  ])('should throw for %s on both attempts', async (_label, respond) => {
    const fetchMock = jest.fn(respond);
    global.fetch = fetchMock as unknown as typeof global.fetch;

    await expect(request()).rejects.toThrow('Things could not be fetched from the BFF');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should throw when the final attempt is not a provider 502, even after one earlier', async () => {
    useFetch(providerBadGateway(), { ok: false, status: 503, json: async () => ({}) });

    await expect(request()).rejects.toThrow('Things could not be fetched from the BFF');
  });
});
