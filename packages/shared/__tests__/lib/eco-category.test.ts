import { ECO_CATEGORIES } from '../../src/lib/eco-category.js';
import type { EcoCategory } from '../../src/lib/eco-category.js';

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

describe('EcoCategory type', () => {
  it('should accept valid EcoCategory values', () => {
    const category: EcoCategory = ECO_CATEGORIES.AIR_QUALITY;
    expect(category).toBe('air-quality');
  });
});
