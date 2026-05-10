import { ECO_CATEGORIES } from '@eco-metrics/shared';

import { slugToTitle } from '../../src/lib/slugToTitle';

describe('slugToTitle', () => {
  it('should capitalize a single-word slug', () => {
    expect(slugToTitle('deforestation')).toBe('Deforestation');
  });

  it('should capitalize each word in a two-word slug', () => {
    expect(slugToTitle('air-quality')).toBe('Air Quality');
  });

  it('should capitalize each word in another two-word slug', () => {
    expect(slugToTitle('global-temperature')).toBe('Global Temperature');
  });

  it('should capitalize each word in a three-word slug', () => {
    expect(slugToTitle('endangered-species')).toBe('Endangered Species');
  });

  it('should capitalize the first letter of a numeric segment', () => {
    expect(slugToTitle('co2-emissions')).toBe('Co2 Emissions');
  });

  it('should return the correct title for waste-recycling', () => {
    expect(slugToTitle('waste-recycling')).toBe('Waste Recycling');
  });

  it('should return the correct title for reforestation', () => {
    expect(slugToTitle('reforestation')).toBe('Reforestation');
  });

  it('should return the correct title for glacier-melting', () => {
    expect(slugToTitle('glacier-melting')).toBe('Glacier Melting');
  });

  it('should return the correct title for plastic-pollution', () => {
    expect(slugToTitle('plastic-pollution')).toBe('Plastic Pollution');
  });

  it('should return the correct title for renewable-energy', () => {
    expect(slugToTitle('renewable-energy')).toBe('Renewable Energy');
  });

  it('should return the correct title for every ECO_CATEGORY slug', () => {
    const expected: Record<string, string> = {
      [ECO_CATEGORIES.AIR_QUALITY]: 'Air Quality',
      [ECO_CATEGORIES.ENDANGERED_SPECIES]: 'Endangered Species',
      [ECO_CATEGORIES.GLOBAL_TEMPERATURE]: 'Global Temperature',
      [ECO_CATEGORIES.DEFORESTATION]: 'Deforestation',
      [ECO_CATEGORIES.OCEAN_HEALTH]: 'Ocean Health',
      [ECO_CATEGORIES.CO2_EMISSIONS]: 'Co2 Emissions',
      [ECO_CATEGORIES.WASTE_RECYCLING]: 'Waste Recycling',
      [ECO_CATEGORIES.REFORESTATION]: 'Reforestation',
      [ECO_CATEGORIES.GLACIER_MELTING]: 'Glacier Melting',
      [ECO_CATEGORIES.PLASTIC_POLLUTION]: 'Plastic Pollution',
      [ECO_CATEGORIES.RENEWABLE_ENERGY]: 'Renewable Energy',
    };

    Object.entries(expected).forEach(([slug, title]) => {
      expect(slugToTitle(slug)).toBe(title);
    });
  });
});
