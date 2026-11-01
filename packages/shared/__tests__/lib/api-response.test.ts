import type { ApiResponse, ApiResponseMeta } from '../../src/lib/api-response';
import type { DataSourceAttribution } from '../../src/lib/data-source-attribution';

describe('ApiResponse', () => {
  const attribution: DataSourceAttribution = {
    provider: 'Our World in Data',
    license: 'CC BY 4.0',
    sourceUrl: 'https://ourworldindata.org/grapher/example',
    lastUpdated: '2024-01-15T00:00:00.000Z',
  };

  const meta: ApiResponseMeta = {
    source: attribution,
    fetchedAt: '2024-01-20T12:00:00.000Z',
  };

  it('should narrow to data when success is true', () => {
    const response: ApiResponse<number> = { success: true, data: 42, status: 200 };
    expect(response.success).toBe(true);
    if (response.success) {
      expect(response.data).toBe(42);
    }
  });

  it('should narrow to error when success is false', () => {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Something went wrong',
      status: 500,
    };
    expect(response.success).toBe(false);
    if (!response.success) {
      expect(response.error).toBe('Something went wrong');
    }
  });

  it('should have status on the success branch', () => {
    const response: ApiResponse<string> = { success: true, data: 'ok', status: 200 };
    expect(response.status).toBe(200);
  });

  it('should have status on the error branch', () => {
    const response: ApiResponse<never> = { success: false, error: 'Not found', status: 404 };
    expect(response.status).toBe(404);
  });

  it('should allow meta on the success branch', () => {
    const response: ApiResponse<number> = {
      success: true,
      data: 42,
      status: 200,
      meta,
    };
    expect(response.success).toBe(true);
    if (response.success) {
      expect(response.meta?.source.provider).toBe('Our World in Data');
      expect(response.meta?.fetchedAt).toBe('2024-01-20T12:00:00.000Z');
    }
  });

  it('should keep meta optional on the success branch (backward compatible)', () => {
    const response: ApiResponse<number> = { success: true, data: 42, status: 200 };
    expect(response.meta).toBeUndefined();
  });

  it('should allow meta on the error branch', () => {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Upstream timeout',
      status: 504,
      meta,
    };
    expect(response.success).toBe(false);
    if (!response.success) {
      expect(response.meta?.source.provider).toBe('Our World in Data');
    }
  });

  it('should keep meta optional on the error branch (backward compatible)', () => {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Not found',
      status: 404,
    };
    expect(response.meta).toBeUndefined();
  });

  it('should keep narrowing semantics unchanged with meta present', () => {
    const responses: ApiResponse<number>[] = [
      { success: true, data: 99, status: 200, meta },
      { success: false, error: 'Upstream timeout', status: 504, meta },
    ];

    const narrowed = responses.map((response) =>
      response.success ? response.data : response.error,
    );

    expect(narrowed).toEqual([99, 'Upstream timeout']);
    expect(responses.every((response) => response.meta === meta)).toBe(true);
  });

  it('should keep the stale flag optional on the meta', () => {
    const fresh: ApiResponseMeta = { source: attribution, fetchedAt: meta.fetchedAt };
    const stale: ApiResponseMeta = { ...fresh, stale: true };

    expect(fresh.stale).toBeUndefined();
    expect(stale.stale).toBe(true);
  });

  it('should only accept a boolean stale flag', () => {
    const invalid: ApiResponseMeta = {
      source: attribution,
      fetchedAt: meta.fetchedAt,
      // @ts-expect-error stale must be a boolean
      stale: 'yes',
    };

    expect(typeof invalid.stale).toBe('string');
  });

  it('should allow meta to flag a stale snapshot', () => {
    const response: ApiResponse<number> = {
      success: true,
      data: 42,
      status: 200,
      meta: { ...meta, stale: true },
    };

    if (response.success) {
      const stale: boolean | undefined = response.meta?.stale;
      expect(stale).toBe(true);
    }
  });
});
