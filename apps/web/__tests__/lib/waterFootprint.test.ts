import { getWaterFootprintProducts } from '@/lib/waterFootprint';

interface MockResponse {
  ok: boolean;
  json: () => Promise<unknown>;
}

describe('getWaterFootprintProducts', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.API_BASE_URL;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const mockFetch = (impl: (url: string) => Promise<MockResponse>) => {
    global.fetch = jest.fn((url: string) => impl(url)) as unknown as typeof global.fetch;
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

  it('should return products when the BFF responds with success', async () => {
    mockFetch(async (url) => {
      const requestUrl = new URL(url);
      expect(requestUrl.pathname).toBe('/api/v1/water-footprint/products');
      expect(requestUrl.search).toBe('');
      return {
        ok: true,
        json: async () => ({ success: true, data: [product], status: 200 }),
      };
    });

    const result = await getWaterFootprintProducts();

    expect(result.fetchFailed).toBe(false);
    expect(result.products).toEqual([product]);
  });

  it('should return fetchFailed when the BFF responds with success:false', async () => {
    mockFetch(async () => ({
      ok: true,
      json: async () => ({ success: false, error: 'Internal error', status: 500 }),
    }));

    const result = await getWaterFootprintProducts();

    expect(result.fetchFailed).toBe(true);
    expect(result.products).toEqual([]);
  });

  it('should return fetchFailed for a non-2xx response', async () => {
    mockFetch(async () => ({
      ok: false,
      json: async () => 'Service Unavailable',
    }));

    const result = await getWaterFootprintProducts();

    expect(result.fetchFailed).toBe(true);
    expect(result.products).toEqual([]);
  });

  it('should return fetchFailed when fetch rejects', async () => {
    mockFetch(async () => {
      throw new Error('Network error');
    });

    const result = await getWaterFootprintProducts();

    expect(result.fetchFailed).toBe(true);
    expect(result.products).toEqual([]);
  });

  it('should return fetchFailed for malformed JSON', async () => {
    mockFetch(async () => ({
      ok: true,
      json: async () => {
        throw new Error('Unexpected token');
      },
    }));

    const result = await getWaterFootprintProducts();

    expect(result.fetchFailed).toBe(true);
    expect(result.products).toEqual([]);
  });

  it('should return fetchFailed when the payload is not an object', async () => {
    mockFetch(async () => ({
      ok: true,
      json: async () => null,
    }));

    const result = await getWaterFootprintProducts();

    expect(result.fetchFailed).toBe(true);
    expect(result.products).toEqual([]);
  });

  it('should return fetchFailed when the payload shape is wrong', async () => {
    mockFetch(async () => ({
      ok: true,
      json: async () => ({ success: true, data: 'not-an-array', status: 200 }),
    }));

    const result = await getWaterFootprintProducts();

    expect(result.fetchFailed).toBe(true);
    expect(result.products).toEqual([]);
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

    const okResponse = async () => ({
      ok: true,
      json: async () => ({ success: true, data: [], status: 200 }),
    });

    it('should send X-Internal-Api-Key and keep the other fetch options when the key is set', async () => {
      process.env.INTERNAL_API_KEY = 'k'.repeat(32);
      mockFetch(okResponse);

      await getWaterFootprintProducts();

      const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit & {
        next?: { revalidate: number };
      };
      expect(init.headers).toEqual({ 'X-Internal-Api-Key': 'k'.repeat(32) });
      expect(init.next).toEqual({ revalidate: 86400 });
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('should send no X-Internal-Api-Key header when the key is unset or whitespace', async () => {
      delete process.env.INTERNAL_API_KEY;
      mockFetch(okResponse);
      await getWaterFootprintProducts();

      process.env.INTERNAL_API_KEY = '   ';
      mockFetch(okResponse);
      await getWaterFootprintProducts();

      const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
      expect(init.headers).toEqual({});
    });
  });
});
