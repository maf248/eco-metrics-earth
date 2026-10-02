import {
  WaterFootprintCategory,
  WaterFootprintWaterType,
  waterFootprintCategorySlugMap,
  waterFootprintWaterTypeLabels,
} from '../../src/lib/water-footprint';

const EXPECTED_CATEGORIES: WaterFootprintCategory[] = [
  'Food & Beverages',
  'Textiles',
  'Technology',
  'Manufactured',
  'Digital & Computing',
  'Vehicles',
  'Energy & Extractives',
];

const EXPECTED_WATER_TYPES: WaterFootprintWaterType[] = [
  'blue',
  'green-blue-grey',
  'lifecycle-onsite',
  'lifecycle-total',
];

describe('waterFootprintCategorySlugMap', () => {
  it('should map every slug to a known WaterFootprintCategory', () => {
    const values = Object.values(waterFootprintCategorySlugMap);
    expect(values.sort()).toEqual(EXPECTED_CATEGORIES.sort());
  });

  it('should have exactly one slug per WaterFootprintCategory', () => {
    const values = Object.values(waterFootprintCategorySlugMap);
    expect(new Set(values).size).toBe(EXPECTED_CATEGORIES.length);
  });

  it('should contain a known set of URL-safe slugs', () => {
    expect(Object.keys(waterFootprintCategorySlugMap).sort()).toEqual(
      [
        'food-beverages',
        'textiles',
        'technology',
        'manufactured',
        'digital-computing',
        'vehicles',
        'energy-extractives',
      ].sort(),
    );
  });
});

describe('waterFootprintWaterTypeLabels', () => {
  it('should have a label for every WaterFootprintWaterType', () => {
    expect(Object.keys(waterFootprintWaterTypeLabels).sort()).toEqual(EXPECTED_WATER_TYPES.sort());
  });

  it('should have the same number of labels as water types', () => {
    expect(Object.keys(waterFootprintWaterTypeLabels)).toHaveLength(EXPECTED_WATER_TYPES.length);
  });

  it('should provide a non-empty label for each water type', () => {
    for (const label of Object.values(waterFootprintWaterTypeLabels)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('should keep the expected human-readable labels', () => {
    expect(waterFootprintWaterTypeLabels).toEqual({
      blue: 'Blue water',
      'green-blue-grey': 'Green + blue + grey',
      'lifecycle-onsite': 'Life cycle (on-site)',
      'lifecycle-total': 'Life cycle (total)',
    });
  });
});
