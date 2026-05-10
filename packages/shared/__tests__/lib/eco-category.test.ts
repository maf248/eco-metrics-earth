import { ECO_CATEGORIES } from '../../src/lib/eco-category';
import type { EcoCategory } from '../../src/lib/eco-category';

describe('ECO_CATEGORIES', () => {
  it('should have exactly 11 entries', () => {
    expect(Object.keys(ECO_CATEGORIES)).toHaveLength(11);
  });

  it('should contain all original category values', () => {
    const values = Object.values(ECO_CATEGORIES);
    expect(values).toContain('air-quality');
    expect(values).toContain('endangered-species');
    expect(values).toContain('global-temperature');
    expect(values).toContain('deforestation');
    expect(values).toContain('ocean-health');
    expect(values).toContain('co2-emissions');
  });

  it('should contain all new category values', () => {
    const values = Object.values(ECO_CATEGORIES);
    expect(values).toContain('reforestation');
    expect(values).toContain('glacier-melting');
    expect(values).toContain('waste-recycling');
    expect(values).toContain('plastic-pollution');
    expect(values).toContain('renewable-energy');
  });
});

describe('EcoCategory type', () => {
  it('should accept valid EcoCategory values', () => {
    const category: EcoCategory = ECO_CATEGORIES.AIR_QUALITY;
    expect(category).toBe('air-quality');
  });
});
