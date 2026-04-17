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

  it('should return the correct title for every ECO_CATEGORY slug', () => {
    const expected: Record<string, string> = {
      [ECO_CATEGORIES.AIR_QUALITY]: 'Air Quality',
      [ECO_CATEGORIES.ENDANGERED_SPECIES]: 'Endangered Species',
      [ECO_CATEGORIES.GLOBAL_TEMPERATURE]: 'Global Temperature',
      [ECO_CATEGORIES.DEFORESTATION]: 'Deforestation',
      [ECO_CATEGORIES.OCEAN_HEALTH]: 'Ocean Health',
      [ECO_CATEGORIES.CO2_EMISSIONS]: 'Co2 Emissions',
    };

    Object.entries(expected).forEach(([slug, title]) => {
      expect(slugToTitle(slug)).toBe(title);
    });
  });
});
