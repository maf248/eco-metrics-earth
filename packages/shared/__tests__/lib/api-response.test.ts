import type { ApiResponse } from '../../src/lib/api-response.js';

describe('ApiResponse', () => {
  it('should allow constructing a valid ApiResponse with data and timestamp', () => {
    const response: ApiResponse<number> = {
      data: 42,
      timestamp: '2026-04-11T00:00:00.000Z',
    };
    expect(response.data).toBe(42);
    expect(response.timestamp).toBe('2026-04-11T00:00:00.000Z');
    expect(response.error).toBeUndefined();
  });

  it('should allow constructing a valid ApiResponse with an error field', () => {
    const response: ApiResponse<null> = {
      data: null,
      timestamp: '2026-04-11T00:00:00.000Z',
      error: 'Something went wrong',
    };
    expect(response.error).toBe('Something went wrong');
  });
});
