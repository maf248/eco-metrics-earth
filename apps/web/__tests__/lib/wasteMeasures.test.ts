import {
  DEFAULT_COMPARED_COUNTRIES,
  defaultComparisonCodes,
  MAX_COMPARED_COUNTRIES,
  formatMeasureValue,
  measureDefinition,
  rankWasteCountries,
  readMeasure,
  WASTE_MEASURES,
} from '@/lib/wasteMeasures';

import { WASTE_COUNTRIES, wasteCountry } from '../fixtures/wasteRecycling';

describe('readMeasure', () => {
  it('should read the recycling share with the treatment data year', () => {
    expect(readMeasure(wasteCountry('DEU'), 'recycled')).toEqual({
      value: 47,
      yearLabel: '2022',
      note: null,
    });
  });

  it('should treat a recycling share the source does not report as not reported, never 0', () => {
    expect(readMeasure(wasteCountry('CHN'), 'recycled').value).toBeNull();
    expect(readMeasure(wasteCountry('NGA'), 'recycled').value).toBeNull();
  });

  it('should sum recycling and composting and name no missing part when both are reported', () => {
    expect(readMeasure(wasteCountry('DEU'), 'recycledOrComposted')).toEqual({
      value: 69.1,
      yearLabel: '2022',
      note: null,
    });
  });

  it('should name composting as not reported for Brazil', () => {
    expect(readMeasure(wasteCountry('BRA'), 'recycledOrComposted')).toEqual({
      value: 1.6,
      yearLabel: '2022',
      note: 'Composting is not reported',
    });
  });

  it('should name recycling as not reported when only composting is reported', () => {
    const country = {
      ...wasteCountry('DEU'),
      treatment: {
        year: 2022,
        shares: { ...wasteCountry('DEU').treatment!.shares, recycling: null },
      },
    };

    expect(readMeasure(country, 'recycledOrComposted').note).toBe('Recycling is not reported');
  });

  it('should have no recycled-or-composted value when neither part is reported', () => {
    expect(readMeasure(wasteCountry('ARG'), 'recycledOrComposted').value).toBeNull();
  });

  it('should read the uncollected share', () => {
    expect(readMeasure(wasteCountry('IND'), 'uncollected').value).toBe(4.6);
    expect(readMeasure(wasteCountry('ARG'), 'uncollected').value).toBeNull();
  });

  it('should read waste per person for every country as a 2022 estimate', () => {
    for (const country of WASTE_COUNTRIES) {
      expect(readMeasure(country, 'perPerson')).toEqual({
        value: country.generation.kgPerPersonPerDay2022,
        yearLabel: '2022 estimate',
        note: null,
      });
    }
  });
});

describe('formatMeasureValue', () => {
  it('should format percentages with one decimal and kilograms with two', () => {
    expect(formatMeasureValue('recycled', 47)).toBe('47.0%');
    expect(formatMeasureValue('perPerson', 1.63)).toBe('1.63 kg');
  });
});

describe('WASTE_MEASURES', () => {
  it('should define five classes for every measure and find each by value', () => {
    for (const { value, breaks, classLabels } of WASTE_MEASURES) {
      expect(classLabels).toHaveLength(breaks.length + 1);
      expect(measureDefinition(value).value).toBe(value);
    }
  });

  it('should throw for an unknown measure', () => {
    expect(() => measureDefinition('nope' as never)).toThrow('Unknown waste measure');
  });
});

describe('defaultComparisonCodes', () => {
  it('should list the most populous countries with treatment, most populous first', () => {
    expect(defaultComparisonCodes(WASTE_COUNTRIES)).toEqual(['CHN', 'IND', 'BRA', 'DEU', 'ARG']);
  });

  it('should stop at the default count, below the maximum', () => {
    const clones = Array.from({ length: 12 }, (_, index) => ({
      ...WASTE_COUNTRIES[0],
      code: `C${index}`,
      population: 2_000_000_000 - index,
    }));

    expect(defaultComparisonCodes(clones)).toHaveLength(DEFAULT_COMPARED_COUNTRIES);
    expect(DEFAULT_COMPARED_COUNTRIES).toBeLessThan(MAX_COMPARED_COUNTRIES);
  });
});

describe('measure ramps', () => {
  it('should use the good-is-high ramp for the recycling measures and heat for the others', () => {
    expect(WASTE_MEASURES.map(({ value, ramp }) => [value, ramp])).toEqual([
      ['recycled', 'good'],
      ['recycledOrComposted', 'good'],
      ['uncollected', 'heat'],
      ['perPerson', 'heat'],
    ]);
  });
});

describe('rankWasteCountries', () => {
  const names = (rows: ReturnType<typeof rankWasteCountries>): string[] =>
    rows.map(({ country }) => country.name);

  it('should rank countries highest first with competition ranks, unranked ones last by name', () => {
    const rows = rankWasteCountries(WASTE_COUNTRIES, { measure: 'recycled', order: 'descending' });

    expect(names(rows)).toEqual([
      'Germany',
      'Brazil',
      'Argentina',
      'China',
      'India',
      'Nigeria',
      'Tuvalu',
    ]);
    expect(rows.map(({ rank }) => rank)).toEqual([1, 2, null, null, null, null, null]);
  });

  it('should keep the rank of a country when the order is reversed', () => {
    const rows = rankWasteCountries(WASTE_COUNTRIES, { measure: 'recycled', order: 'ascending' });

    expect(names(rows).slice(0, 2)).toEqual(['Brazil', 'Germany']);
    expect(rows.map(({ rank }) => rank).slice(0, 2)).toEqual([2, 1]);
    expect(rows[2].rank).toBeNull();
  });

  it('should give equal values the same rank and the next rank after the tie', () => {
    const twin = { ...wasteCountry('BRA'), code: 'BRB', name: 'Barbados' };
    const rows = rankWasteCountries([...WASTE_COUNTRIES, twin], {
      measure: 'recycled',
      order: 'descending',
    });

    expect(rows.slice(0, 3).map(({ rank }) => rank)).toEqual([1, 2, 2]);
    expect(names(rows).slice(1, 3)).toEqual(['Barbados', 'Brazil']);
  });

  it('should rank waste per person for every country', () => {
    const rows = rankWasteCountries(WASTE_COUNTRIES, { measure: 'perPerson', order: 'descending' });

    expect(rows.every(({ rank }) => rank !== null)).toBe(true);
    expect(names(rows)[0]).toBe('Germany');
  });
});
