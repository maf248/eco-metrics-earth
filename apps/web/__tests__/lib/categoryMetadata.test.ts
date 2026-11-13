import { CATEGORY_DESCRIPTIONS, getCategoryMetadataTitle } from '@/lib/categoryMetadata';
import { getCategoryTitle } from '@/lib/categoryTitle';
import { SITE_DESCRIPTION } from '@/lib/socialMetadata';
import { ECO_CATEGORIES, type EcoCategory } from '@eco-metrics/shared';

const CATEGORIES: EcoCategory[] = Object.values(ECO_CATEGORIES);
const LIVE = [
  ECO_CATEGORIES.WATER_FOOTPRINT,
  ECO_CATEGORIES.CO2_EMISSIONS,
  ECO_CATEGORIES.GLOBAL_TEMPERATURE,
  ECO_CATEGORIES.ENERGY_SOURCES,
  ECO_CATEGORIES.WASTE_RECYCLING,
];
const PLACEHOLDERS = CATEGORIES.filter((slug) => !LIVE.some((live) => live === slug));

describe('CATEGORY_DESCRIPTIONS', () => {
  it.each(CATEGORIES)('should have a 110-160 character description for %s', (slug) => {
    const length = CATEGORY_DESCRIPTIONS[slug].length;
    expect(length).toBeGreaterThanOrEqual(110);
    expect(length).toBeLessThanOrEqual(160);
  });

  it('should have 12 distinct descriptions that differ from the site description', () => {
    const values = CATEGORIES.map((slug) => CATEGORY_DESCRIPTIONS[slug]);
    expect(CATEGORIES).toHaveLength(12);
    expect(new Set(values).size).toBe(12);
    expect(values).not.toContain(SITE_DESCRIPTION);
  });

  it('should have exactly 7 honest placeholders', () => {
    expect(PLACEHOLDERS).toHaveLength(7);
  });

  it('should describe the live CO2 emissions content', () => {
    expect(CATEGORY_DESCRIPTIONS['co2-emissions']).toBe(
      'CO2 emissions by country since 1950: a world map and ranking of emissions per person, and yearly totals for every country. Data from Our World in Data.',
    );
    expect(CATEGORY_DESCRIPTIONS['co2-emissions']).not.toMatch(/coming/);
  });

  it('should describe the live global temperature content', () => {
    expect(CATEGORY_DESCRIPTIONS['global-temperature']).toBe(
      "Global temperature by country since 1940: how far each year's surface temperature is from the 1991–2020 average. Data from Our World in Data.",
    );
    expect(CATEGORY_DESCRIPTIONS['global-temperature']).not.toMatch(/coming/);
  });

  it('should describe the live energy sources content', () => {
    expect(CATEGORY_DESCRIPTIONS['energy-sources']).toBe(
      'Electricity mix by country since 2000: coal, gas, oil, nuclear, hydro, wind, solar and bioenergy, as a share and in TWh. Data from Our World in Data.',
    );
    expect(CATEGORY_DESCRIPTIONS['energy-sources']).not.toMatch(/coming/);
  });

  it('should describe the live waste and recycling content', () => {
    expect(CATEGORY_DESCRIPTIONS['waste-recycling']).toBe(
      'Municipal waste by country: how much each generates per person, how much is recycled, composted or dumped, and projections to 2050. Data from the World Bank.',
    );
    expect(CATEGORY_DESCRIPTIONS['waste-recycling']).not.toMatch(/coming/);
  });

  it.each(PLACEHOLDERS)('should state that the data is coming for placeholder %s', (slug) => {
    expect(CATEGORY_DESCRIPTIONS[slug]).toMatch(/coming soon|coming to eco-metrics earth/);
  });
});

describe('getCategoryMetadataTitle', () => {
  it.each([
    ['water-footprint', 'Water Footprint of Food & Products'],
    ['co2-emissions', 'CO2 Emissions by Country'],
    ['global-temperature', 'Global Temperature Anomalies by Country'],
    ['energy-sources', 'Electricity Mix by Country'],
    ['waste-recycling', 'Waste Generation & Recycling by Country'],
  ] as const)('should return the keyword-bearing override for %s', (slug, title) => {
    expect(getCategoryMetadataTitle(slug)).toBe(title);
  });

  it.each(PLACEHOLDERS)('should return the category name for %s', (slug) => {
    expect(getCategoryMetadataTitle(slug)).toBe(getCategoryTitle(slug));
  });
});
