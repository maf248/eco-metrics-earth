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

const request = (requireMeta?: boolean) =>
  fetchEnvelopeFromBff({ path: '/things', label: 'Things', isData: isNumberList, requireMeta });

describe('fetchEnvelopeFromBff', () => {
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

  it('should return the data and meta after one request', async () => {
    const fetchMock = mockFetch({ success: true, data: [1], status: 200, meta: META });

    await expect(request(true)).resolves.toEqual({ data: [1], meta: META });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should fail both attempts when required meta is missing', async () => {
    const fetchMock = mockFetch({ success: true, data: [1], status: 200 });

    await expect(request(true)).rejects.toThrow('Things could not be fetched from the BFF');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a non-object meta', 'nope'],
    ['a meta without source', { fetchedAt: META.fetchedAt }],
    ['a meta without fetchedAt', { source: META.source }],
    ['a source missing a string field', { ...META, source: { ...META.source, license: 1 } }],
  ])('should reject %s when meta is required', async (_label, meta) => {
    mockFetch({ success: true, data: [1], status: 200, meta });

    await expect(request(true)).rejects.toThrow('Things could not be fetched from the BFF');
  });

  it('should treat meta as optional by default', async () => {
    mockFetch({ success: true, data: [1], status: 200 });

    await expect(request()).resolves.toEqual({ data: [1], meta: undefined });
  });

  it('should drop a malformed meta when it is not required', async () => {
    mockFetch({ success: true, data: [1], status: 200, meta: 'nope' });

    await expect(request()).resolves.toEqual({ data: [1], meta: undefined });
  });
});
