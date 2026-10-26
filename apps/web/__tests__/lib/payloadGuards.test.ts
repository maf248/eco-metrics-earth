import {
  hasStrings,
  isDataSourceOrigin,
  isNumberOrNullArray,
  isYearAlignedCountryData,
} from '@/lib/payloadGuards';
import { listYears } from '@/lib/yearRange';

const world = { code: 'OWID_WRL', iso2: null, name: 'World', anomaly: [0.1, null, 0.3] };
const argentina = { code: 'ARG', iso2: 'AR', name: 'Argentina', anomaly: [-0.1, 0, null] };

const valid = { startYear: 2000, endYear: 2002, entities: [world, argentina] };

describe('isNumberOrNullArray', () => {
  it('should accept numbers and nulls of the right length', () => {
    expect(isNumberOrNullArray([1, null, -2], 3)).toBe(true);
  });

  it.each([
    ['a wrong length', [1, 2], 3],
    ['a string element', [1, 'a', 3], 3],
    ['a non-array', 'abc', 3],
  ])('should reject %s', (_label, value, length) => {
    expect(isNumberOrNullArray(value, length)).toBe(false);
  });
});

describe('hasStrings', () => {
  it('should accept an object whose keys are strings', () => {
    expect(hasStrings({ a: 'x', b: 'y' }, ['a', 'b'])).toBe(true);
  });

  it.each([
    ['a missing key', { a: 'x' }],
    ['a non-string value', { a: 'x', b: 1 }],
    ['null', null],
    ['a primitive', 'text'],
  ])('should reject %s', (_label, value) => {
    expect(hasStrings(value, ['a', 'b'])).toBe(false);
  });
});

describe('isYearAlignedCountryData', () => {
  it('should accept aligned arrays for every measure key with World present', () => {
    expect(isYearAlignedCountryData(valid, ['anomaly'])).toBe(true);
  });

  it('should require the array of every given measure key', () => {
    expect(isYearAlignedCountryData(valid, ['anomaly', 'other'])).toBe(false);
  });

  it('should reject a misaligned array', () => {
    const data = { ...valid, entities: [world, { ...argentina, anomaly: [1, 2] }] };

    expect(isYearAlignedCountryData(data, ['anomaly'])).toBe(false);
  });

  it('should reject a payload without the World entity', () => {
    expect(isYearAlignedCountryData({ ...valid, entities: [argentina] }, ['anomaly'])).toBe(false);
  });

  it('should reject empty entities, an inverted range and non-objects', () => {
    expect(isYearAlignedCountryData({ ...valid, entities: [] }, ['anomaly'])).toBe(false);
    expect(isYearAlignedCountryData({ ...valid, endYear: 1990 }, ['anomaly'])).toBe(false);
    expect(isYearAlignedCountryData({ ...valid, startYear: '2000' }, ['anomaly'])).toBe(false);
    expect(isYearAlignedCountryData(null, ['anomaly'])).toBe(false);
  });

  it('should reject an entity with a bad iso2 or without a name', () => {
    expect(
      isYearAlignedCountryData({ ...valid, entities: [world, { ...argentina, iso2: 5 }] }, [
        'anomaly',
      ]),
    ).toBe(false);
    expect(
      isYearAlignedCountryData({ ...valid, entities: [world, { ...argentina, name: 1 }] }, [
        'anomaly',
      ]),
    ).toBe(false);
    expect(isYearAlignedCountryData({ ...valid, entities: [world, null] }, ['anomaly'])).toBe(
      false,
    );
  });
});

describe('listYears', () => {
  it('should list every year of the range', () => {
    expect(listYears({ startYear: 2020, endYear: 2022 })).toEqual([2020, 2021, 2022]);
  });
});

describe('isDataSourceOrigin', () => {
  const origin = {
    producer: 'Producer',
    title: 'Dataset',
    url: 'https://producer.example',
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  };

  it('should accept an origin with and without the optional texts', () => {
    expect(isDataSourceOrigin(origin)).toBe(true);
    expect(isDataSourceOrigin({ ...origin, notice: 'n', citation: 'c', disclaimer: 'd' })).toBe(
      true,
    );
  });

  it.each([
    ['no license', { ...origin, license: undefined }],
    ['a license without a url', { ...origin, license: { name: 'x' } }],
    ['a missing title', { ...origin, title: undefined }],
    ['a non-string notice', { ...origin, notice: 5 }],
    ['null', null],
  ])('should reject %s', (_label, value) => {
    expect(isDataSourceOrigin(value)).toBe(false);
  });
});
