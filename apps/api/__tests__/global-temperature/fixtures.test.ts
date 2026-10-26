import { readFileSync } from 'fs';
import { join } from 'path';

import { listCountryEntityCodes } from '@eco-metrics/shared';

const FIXTURES = join(__dirname, 'fixtures');

interface CsvRow {
  entity: string;
  code: string;
  year: number;
  values: string[];
}

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

function parseRows(text: string): CsvRow[] {
  const [, ...lines] = text.trim().split(/\r?\n/);
  return lines.map((line) => {
    const [entity, code, year, ...values] = line.split(',');
    return { entity, code, year: Number(year), values };
  });
}

describe('global temperature fixtures', () => {
  const perCountry = parseRows(readFixture('annual-temperature-anomalies.csv'));
  const globalSeries = parseRows(readFixture('temperature-anomaly.csv'));
  const allowlist = listCountryEntityCodes();

  it('should cover World, Kosovo, a continent aggregate and a code outside the allowlist in the per-country chart', () => {
    const codes = new Set(perCountry.map((row) => row.code));

    expect(codes.has('OWID_WRL')).toBe(true);
    expect(codes.has('OWID_KOS')).toBe(true);
    expect(codes.has('OWID_EUR')).toBe(true);
    expect(codes.has('ZZZ')).toBe(true);
    expect(allowlist).toContain('OWID_WRL');
    expect(allowlist).toContain('OWID_KOS');
    expect(allowlist).not.toContain('OWID_EUR');
    expect(allowlist).not.toContain('ZZZ');
  });

  it('should cover a negative value, a value that rounds to zero and a missing year in the per-country chart', () => {
    const values = perCountry.flatMap((row) => row.values);

    expect(values.some((value) => value !== '' && Number(value) < 0)).toBe(true);
    expect(values).toContain('-0.001');
    expect(values).toContain('');
  });

  it('should cover the years 1940 to 1942 in the per-country chart', () => {
    const years = new Set(perCountry.map((row) => row.year));

    expect([...years].sort()).toEqual([1940, 1941, 1942]);
  });

  it('should cover World with its bounds from 1850, a blank bound and both hemispheres in the global chart', () => {
    const codes = new Set(globalSeries.map((row) => row.code));
    const years = new Set(globalSeries.map((row) => row.year));
    const hasBlankBound = globalSeries.some((row) => row.values[1] === '' || row.values[2] === '');

    expect(codes).toEqual(new Set(['OWID_WRL', 'OWID_NH', 'OWID_SH']));
    expect([...years].sort()).toEqual([1850, 1851, 1852]);
    expect(hasBlankBound).toBe(true);
  });

  it('should capture the per-country and the pre-industrial indicator metadata with their baselines', () => {
    const perCountryMeta = JSON.parse(readFixture('indicator-1325256-metadata.json'));
    const globalMeta = JSON.parse(readFixture('indicator-1325020-metadata.json'));

    expect(perCountryMeta.id).toBe(1325256);
    expect(perCountryMeta.descriptionShort).toContain('1991-2020');
    expect(globalMeta.id).toBe(1325020);
    expect(globalMeta.descriptionShort).toContain('1861-1890');
  });
});
