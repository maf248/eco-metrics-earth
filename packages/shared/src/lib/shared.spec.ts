import { ECO_CATEGORIES } from './eco-category.js';
import type { EcoCategory } from './eco-category.js';
import type { ApiResponse } from './api-response.js';

describe('ECO_CATEGORIES', () => {
  it('should have exactly 6 entries', () => {
    expect(Object.keys(ECO_CATEGORIES)).toHaveLength(6);
  });

  it('should contain all MVP category values', () => {
    const values = Object.values(ECO_CATEGORIES);
    expect(values).toContain('air-quality');
    expect(values).toContain('endangered-species');
    expect(values).toContain('global-temperature');
    expect(values).toContain('deforestation');
    expect(values).toContain('ocean-health');
    expect(values).toContain('co2-emissions');
  });
});

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

describe('EcoCategory type', () => {
  it('should accept valid EcoCategory values', () => {
    const category: EcoCategory = ECO_CATEGORIES.AIR_QUALITY;
    expect(category).toBe('air-quality');
  });
});
