import { readFileSync } from 'fs';
import { join } from 'path';

import type { MetricSeries } from '@eco-metrics/shared';
import { listCountryEntityCodes } from '@eco-metrics/shared';

import { ProviderDataError } from '../../src/common/errors/provider-error';
import {
  buildCo2EmissionsData,
  type BuildCo2EmissionsInput,
} from '../../src/modules/co2-emissions/co2-emissions.service';
import type { OwidIndicatorMetadata } from '../../src/modules/providers/owid/owid.types';
import {
  parseGrapherTable,
  selectGrapherColumn,
} from '../../src/modules/providers/owid/parseGrapherCsv';

const FIXTURES = join(__dirname, 'fixtures');

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

function series(csvName: string, column: string): MetricSeries[] {
  return selectGrapherColumn(parseGrapherTable(readFixture(csvName)), column);
}

function metadata(id: string): OwidIndicatorMetadata {
  const raw = JSON.parse(readFixture(`indicator-${id}-metadata.json`)) as Record<
    string,
    unknown
  > & {
    dimensions: { entities: { values: OwidIndicatorMetadata['entities'] } };
  };
  return {
    id: raw.id as number,
    name: raw.name as string,
    unit: raw.unit as string,
    shortUnit: raw.shortUnit as string,
    datasetName: raw.datasetName as string,
    datasetVersion: raw.datasetVersion as string,
    timespan: raw.timespan as string,
    updatedAt: raw.updatedAt as string,
    descriptionShort: null,
    entities: raw.dimensions.entities.values,
  };
}

function fixtureInput(overrides: Partial<BuildCo2EmissionsInput> = {}): BuildCo2EmissionsInput {
  return {
    total: series('annual-co2-emissions-per-country.csv', 'emissions_total'),
    perCapita: series('co-emissions-per-capita.csv', 'emissions_total_per_capita'),
    totalMetadata: metadata('1119906'),
    perCapitaMetadata: metadata('1119914'),
    allowedCodes: new Set(listCountryEntityCodes()),
    ...overrides,
  };
}

function entity(input: BuildCo2EmissionsInput, code: string) {
  const found = buildCo2EmissionsData(input).data.entities.find((e) => e.code === code);
  if (!found) {
    throw new Error(`entity ${code} not in result`);
  }
  return found;
}

const idx = (year: number): number => year - 1950;

function point(year: number, value: number | null) {
  return { year, value };
}

function makeSeries(code: string, name: string, points: MetricSeries['points']): MetricSeries {
  return { entityCode: code, entityName: name, points };
}

describe('buildCo2EmissionsData', () => {
  it('should not add an origin: the service attaches it', () => {
    expect(buildCo2EmissionsData(fixtureInput()).data).not.toHaveProperty('origin');
  });

  it('should align every entity array with the year range of the data', () => {
    const { data } = buildCo2EmissionsData(fixtureInput());

    expect(data.startYear).toBe(1950);
    expect(data.endYear).toBe(1995);
    for (const e of data.entities) {
      expect(e.total).toHaveLength(46);
      expect(e.perCapita).toHaveLength(46);
    }
  });

  it('should leave a null where the source reports no value for a year', () => {
    const usa = entity(fixtureInput(), 'USA');

    expect(usa.perCapita[idx(1950)]).toBe(16.48);
    expect(usa.perCapita[idx(1951)]).toBeNull();
    expect(usa.perCapita[idx(1952)]).toBe(16.07);
    expect(usa.total[idx(1951)]).toBe(2618.704);
    expect(usa.total[idx(1960)]).toBeNull();
  });

  it('should convert totals to million tonnes rounded to 3 decimals', () => {
    expect(entity(fixtureInput(), 'ARG').total[idx(1950)]).toBe(29.921);
  });

  it('should round per-capita values to 2 decimals', () => {
    expect(entity(fixtureInput(), 'ARG').perCapita[idx(1950)]).toBe(1.76);
  });

  it('should keep an entity without per-capita data with an all-null array', () => {
    const ata = entity(fixtureInput(), 'ATA');

    expect(ata.perCapita.every((v) => v === null)).toBe(true);
    expect(ata.total[idx(1987)]).toBe(0.004);
  });

  it('should drop an entity that has no value in any year of either metric', () => {
    const input = fixtureInput({
      total: [
        ...fixtureInput().total,
        makeSeries('FRA', 'France', [point(1950, null), point(1951, null)]),
      ],
    });

    const codes = buildCo2EmissionsData(input).data.entities.map((e) => e.code);

    expect(codes).not.toContain('FRA');
  });

  it('should drop aggregates and codes outside the allowlist even if the provider returns them', () => {
    const input = fixtureInput({
      total: [
        ...fixtureInput().total,
        makeSeries('OWID_HIC', 'High-income countries', [point(1950, 1000)]),
        makeSeries('OWID_EU27', 'EU27', [point(1950, 1000)]),
        makeSeries('ZZZ', 'Nowhere', [point(1950, 1000)]),
      ],
    });

    const codes = buildCo2EmissionsData(input).data.entities.map((e) => e.code);

    expect(codes).not.toContain('OWID_EUR');
    expect(codes).not.toContain('OWID_HIC');
    expect(codes).not.toContain('OWID_EU27');
    expect(codes).not.toContain('ZZZ');
  });

  it('should return World first with no alpha-2 code', () => {
    const [first] = buildCo2EmissionsData(fixtureInput()).data.entities;

    expect(first.code).toBe('OWID_WRL');
    expect(first.iso2).toBeNull();
    expect(first.name).toBe('World');
  });

  it('should carry alpha-2 codes for countries and Kosovo', () => {
    const input = fixtureInput();

    expect(entity(input, 'ARG').iso2).toBe('AR');
    expect(entity(input, 'USA').iso2).toBe('US');
    expect(entity(input, 'OWID_KOS').iso2).toBe('XK');
  });

  it('should order countries by name after World', () => {
    const names = buildCo2EmissionsData(fixtureInput()).data.entities.map((e) => e.name);

    expect(names).toEqual(['World', 'Antarctica', 'Argentina', 'Kosovo', 'United States']);
  });

  it('should be deterministic', () => {
    expect(buildCo2EmissionsData(fixtureInput())).toEqual(buildCo2EmissionsData(fixtureInput()));
  });

  it('should keep Kosovo zero values as zero', () => {
    const kosovo = entity(fixtureInput(), 'OWID_KOS');

    expect(kosovo.total[idx(1994)]).toBe(0);
    expect(kosovo.perCapita[idx(1995)]).toBe(0);
  });

  it('should take dataset identity and the latest provider timestamp from the metadata', () => {
    const result = buildCo2EmissionsData(fixtureInput());

    expect(result.data.dataset).toEqual({ name: 'Global Carbon Budget', version: '2025-11-13' });
    expect(result.lastUpdated).toBe('2026-10-22T21:47:04.000Z');
    expect(result.data.units).toEqual({ total: 'Mt CO2', perCapita: 't CO2 per person' });
  });

  it('should pick the latest timestamp whichever indicator is newer', () => {
    const input = fixtureInput();
    const swapped = fixtureInput({
      totalMetadata: input.perCapitaMetadata,
      perCapitaMetadata: input.totalMetadata,
    });

    expect(buildCo2EmissionsData(swapped).lastUpdated).toBe('2026-10-22T21:47:04.000Z');
  });

  it('should ignore years before the start year', () => {
    const input = fixtureInput({
      total: [
        ...fixtureInput().total,
        makeSeries('OWID_WRL', 'World', [point(1949, 1), point(1950, 5_000_000)]),
      ],
    });

    const world = entity(input, 'OWID_WRL');

    expect(world.total).toHaveLength(46);
    expect(world.total[0]).toBe(5);
  });

  it('should throw a data error when there is no World entity', () => {
    const input = fixtureInput({
      total: fixtureInput().total.filter((s) => s.entityCode !== 'OWID_WRL'),
      perCapita: fixtureInput().perCapita.filter((s) => s.entityCode !== 'OWID_WRL'),
    });

    expect(() => buildCo2EmissionsData(input)).toThrow(ProviderDataError);
  });

  it('should throw a data error when there are no rows', () => {
    expect(() => buildCo2EmissionsData(fixtureInput({ total: [], perCapita: [] }))).toThrow(
      ProviderDataError,
    );
  });

  it('should throw a data error when no year has a value', () => {
    const empty = [makeSeries('OWID_WRL', 'World', [point(1950, null)])];

    expect(() => buildCo2EmissionsData(fixtureInput({ total: empty, perCapita: empty }))).toThrow(
      ProviderDataError,
    );
  });

  it('should name an entity from the per-capita series when it has no total series', () => {
    const input = fixtureInput({
      perCapita: [
        ...fixtureInput().perCapita,
        makeSeries('CXR', 'Christmas Island', [point(1970, 4.2)]),
      ],
    });

    const christmas = entity(input, 'CXR');

    expect(christmas.name).toBe('Christmas Island');
    expect(christmas.total.every((v) => v === null)).toBe(true);
  });
});
