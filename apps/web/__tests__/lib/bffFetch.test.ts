import { inspect } from 'node:util';

import { fetchFromBff } from '@/lib/bffFetch';

type FetchInit = RequestInit & { next?: { revalidate: number } };
type MockResponse = Pick<Response, 'ok' | 'status' | 'json'>;

const isNumberList = (data: unknown): data is number[] =>
  Array.isArray(data) && data.every((item) => typeof item === 'number');

const request = () => fetchFromBff({ path: '/things', label: 'Things', isData: isNumberList });

describe('fetchFromBff', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.INTERNAL_API_KEY;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    delete process.env.API_BASE_URL;
    delete process.env.INTERNAL_API_KEY;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.INTERNAL_API_KEY;
    } else {
      process.env.INTERNAL_API_KEY = originalKey;
    }
    jest.restoreAllMocks();
  });

  const mockFetch = (...responses: Array<() => Promise<MockResponse>>): jest.Mock => {
    const fetchMock = jest.fn();
    responses.forEach((response) => fetchMock.mockImplementationOnce(response));
    global.fetch = fetchMock as unknown as typeof global.fetch;
    return fetchMock;
  };

  const body = (json: unknown) => async (): Promise<MockResponse> => ({
    ok: true,
    status: 200,
    json: async () => json,
  });

  const success = body({ success: true, data: [1, 2], status: 200 });

  const timeout = async (): Promise<MockResponse> => {
    throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  };

  it('should resolve with the data after one request and log nothing', async () => {
    const fetchMock = mockFetch(success);

    await expect(request()).resolves.toEqual([1, 2]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe('/api/v1/things');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should retry once with a fresh timeout signal when the first attempt times out', async () => {
    const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');
    const fetchMock = mockFetch(timeout, success);

    await expect(request()).resolves.toEqual([1, 2]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(timeoutSpy).toHaveBeenCalledTimes(2);
    expect(timeoutSpy).toHaveBeenNthCalledWith(1, 10_000);
    expect(fetchMock.mock.calls[1][1].signal).not.toBe(fetchMock.mock.calls[0][1].signal);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
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
        async () => ({ ok: false, status: 503, json: async () => null }),
      ],
      ['the BFF responds with success:false', body({ success: false, error: 'boom', status: 500 })],
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
      ['the payload is not an object', body(null)],
      ['the data is rejected by the guard', body({ success: true, data: ['x'], status: 200 })],
    ];

    it.each(failures)(
      'should make 2 attempts, log one error and throw when %s',
      async (_label, failure) => {
        const fetchMock = mockFetch(failure, failure);

        await expect(request()).rejects.toThrow('Things could not be fetched from the BFF');

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      },
    );

    it('should attach the last failure as the error cause', async () => {
      const lastFailure = new Error('second attempt failed');
      mockFetch(timeout, async () => {
        throw lastFailure;
      });

      const error: unknown = await request().catch((caught: unknown) => caught);

      expect((error as Error).cause).toBe(lastFailure);
    });
  });

  describe('internal API key', () => {
    it('should send the key with the cache and timeout options on every attempt', async () => {
      process.env.INTERNAL_API_KEY = 'k'.repeat(32);
      const fetchMock = mockFetch(timeout, success);

      await request();

      for (const [, init] of fetchMock.mock.calls as Array<[string, FetchInit]>) {
        expect(init.headers).toEqual({ 'X-Internal-Api-Key': 'k'.repeat(32) });
        expect(init.next).toEqual({ revalidate: 86400 });
        expect(init.signal).toBeInstanceOf(AbortSignal);
      }
    });

    it('should send no key header when the key is unset', async () => {
      const fetchMock = mockFetch(success);

      await request();

      expect((fetchMock.mock.calls[0][1] as FetchInit).headers).toEqual({});
    });

    it('should never log the key when both attempts fail', async () => {
      process.env.INTERNAL_API_KEY = 'k'.repeat(32);
      mockFetch(timeout, timeout);

      await expect(request()).rejects.toThrow();

      expect(inspect(consoleErrorSpy.mock.calls, { depth: null })).not.toContain('k'.repeat(32));
    });
  });
});
