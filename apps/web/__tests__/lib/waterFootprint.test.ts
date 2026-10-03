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

  it('should return fetchFailed when the payload shape is wrong', async () => {
    mockFetch(async () => ({
      ok: true,
      json: async () => ({ success: true, data: 'not-an-array', status: 200 }),
    }));

    const result = await getWaterFootprintProducts();

    expect(result.fetchFailed).toBe(true);
    expect(result.products).toEqual([]);
  });
});
