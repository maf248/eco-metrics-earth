import { inspect } from 'node:util';

import { getWaterFootprintProducts } from '@/lib/waterFootprint';

interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

type FetchInit = RequestInit & { next?: { revalidate: number } };

describe('getWaterFootprintProducts', () => {
  const originalFetch = global.fetch;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    delete process.env.API_BASE_URL;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const mockFetch = (...responses: Array<() => Promise<MockResponse>>): jest.Mock => {
    const fetchMock = jest.fn();
    responses.forEach((response) => fetchMock.mockImplementationOnce(response));
    global.fetch = fetchMock as unknown as typeof global.fetch;
    return fetchMock;
  };

  const product = {
    product: 'Apples',
    category: 'Food & Beverages',
    waterFootprintLiters: 180.1,
    unit: 'per kg',
    waterType: 'blue',
    source: 'Poore & Nemecek (2018), Science',
    sourceUrl: 'https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore',
    methodology: 'Freshwater withdrawals per kg of final product.',
  };

  const success = async (): Promise<MockResponse> => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: [product], status: 200 }),
  });

  const timeout = async (): Promise<MockResponse> => {
    throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  };

  it('should return products from a single request when the BFF responds with success', async () => {
    const fetchMock = mockFetch(success);

    const products = await getWaterFootprintProducts();

    expect(products).toEqual([product]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestUrl.pathname).toBe('/api/v1/water-footprint/products');
    expect(requestUrl.search).toBe('');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should retry once and return products when the first attempt times out (cold start)', async () => {
    const fetchMock = mockFetch(timeout, success);

    const products = await getWaterFootprintProducts();

    expect(products).toEqual([product]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should use a new 10 s timeout signal for each attempt', async () => {
    const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');
    const fetchMock = mockFetch(timeout, success);

    await getWaterFootprintProducts();

    expect(timeoutSpy).toHaveBeenCalledTimes(2);
    expect(timeoutSpy).toHaveBeenNthCalledWith(1, 10_000);
    expect(timeoutSpy).toHaveBeenNthCalledWith(2, 10_000);
    const firstSignal = (fetchMock.mock.calls[0][1] as FetchInit).signal;
    const secondSignal = (fetchMock.mock.calls[1][1] as FetchInit).signal;
    expect(firstSignal).toBeInstanceOf(AbortSignal);
    expect(secondSignal).toBeInstanceOf(AbortSignal);
    expect(secondSignal).not.toBe(firstSignal);
  });

  describe('when both attempts fail', () => {
    const failures: Array<[string, () => Promise<MockResponse>]> = [
      ['the request times out', timeout],
      [
        'fetch rejects with a network error',
        async () => {
          throw new Error('Network error');
        },
      ],
      [
        'the BFF responds with a non-2xx status',
        async () => ({ ok: false, status: 503, json: async () => 'Service Unavailable' }),
      ],
      [
        'the BFF responds with success:false',
        async () => ({
          ok: true,
          status: 200,
          json: async () => ({ success: false, error: 'Internal error', status: 500 }),
        }),
      ],
      [
        'the JSON is malformed',
        async () => ({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error('Unexpected token');
          },
        }),
      ],
      [
        'the payload is not an object',
        async () => ({ ok: true, status: 200, json: async () => null }),
      ],
      [
        'the payload shape is wrong',
        async () => ({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: 'not-an-array', status: 200 }),
        }),
      ],
    ];

    it.each(failures)(
      'should make 2 attempts, log one error and throw when %s',
      async (_label, failure) => {
        const fetchMock = mockFetch(failure, failure);

        await expect(getWaterFootprintProducts()).rejects.toThrow(
          'Water footprint data could not be fetched from the BFF',
        );

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      },
    );

    it('should attach the last failure as the error cause', async () => {
      const lastFailure = new Error('second attempt failed');
      mockFetch(timeout, async () => {
        throw lastFailure;
      });

      const error: unknown = await getWaterFootprintProducts().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).cause).toBe(lastFailure);
    });
  });

  describe('internal API key header', () => {
    const originalKey = process.env.INTERNAL_API_KEY;

    afterEach(() => {
      if (originalKey === undefined) {
        delete process.env.INTERNAL_API_KEY;
      } else {
        process.env.INTERNAL_API_KEY = originalKey;
      }
    });

    it('should send X-Internal-Api-Key with the cache and timeout options on every attempt', async () => {
      process.env.INTERNAL_API_KEY = 'k'.repeat(32);
      const fetchMock = mockFetch(timeout, success);

      await getWaterFootprintProducts();

      for (const call of fetchMock.mock.calls) {
        const init = call[1] as FetchInit;
        expect(init.headers).toEqual({ 'X-Internal-Api-Key': 'k'.repeat(32) });
        expect(init.next).toEqual({ revalidate: 86400 });
        expect(init.signal).toBeInstanceOf(AbortSignal);
      }
    });

    it('should never log the internal API key when both attempts fail', async () => {
      process.env.INTERNAL_API_KEY = 'k'.repeat(32);
      mockFetch(timeout, timeout);

      await expect(getWaterFootprintProducts()).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      // inspect() renders Error messages and stacks, which JSON.stringify would drop.
      const logged = inspect(consoleErrorSpy.mock.calls, { depth: null });
      expect(logged).toContain('Water footprint fetch failed after 2 attempts');
      expect(logged).not.toContain('k'.repeat(32));
    });

    it('should send no X-Internal-Api-Key header when the key is unset or whitespace', async () => {
      delete process.env.INTERNAL_API_KEY;
      let fetchMock = mockFetch(success);
      await getWaterFootprintProducts();
      expect((fetchMock.mock.calls[0][1] as FetchInit).headers).toEqual({});

      process.env.INTERNAL_API_KEY = '   ';
      fetchMock = mockFetch(success);
      await getWaterFootprintProducts();
      expect((fetchMock.mock.calls[0][1] as FetchInit).headers).toEqual({});
    });
  });
});
