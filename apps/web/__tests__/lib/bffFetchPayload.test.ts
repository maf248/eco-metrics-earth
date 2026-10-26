import { fetchPayloadFromBff } from '@/lib/bffFetch';

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
  fetchPayloadFromBff({ path: '/things', label: 'Things', isData: isNumberList });

describe('fetchPayloadFromBff', () => {
  const originalFetch = global.fetch;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const mockFetch = (json: unknown): jest.Mock => {
    const fetchMock = jest.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => json,
    }));
    global.fetch = fetchMock as unknown as typeof global.fetch;
    return fetchMock;
  };

  it('should resolve with the data and the meta after one request', async () => {
    const fetchMock = mockFetch({ success: true, data: [1, 2], status: 200, meta: META });

    await expect(request()).resolves.toEqual({ data: [1, 2], meta: META });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should fail both attempts and log once when the meta is missing', async () => {
    const fetchMock = mockFetch({ success: true, data: [1], status: 200 });

    await expect(request()).rejects.toThrow('Things could not be fetched from the BFF');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('should fail when the data does not match the guard', async () => {
    mockFetch({ success: true, data: ['a'], status: 200, meta: META });

    await expect(request()).rejects.toThrow('Things could not be fetched from the BFF');
  });
});
