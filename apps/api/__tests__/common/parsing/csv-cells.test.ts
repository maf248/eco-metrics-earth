import { ProviderDataError } from '../../../src/common/errors/provider-error';
import { isIsoCalendarDate, parseFiniteNumber } from '../../../src/common/parsing/csv-cells';

describe('isIsoCalendarDate', () => {
  it('should accept an existing calendar date, 29 February of a leap year included', () => {
    expect(isIsoCalendarDate('2026-11-23')).toBe(true);
    expect(isIsoCalendarDate('2024-02-29')).toBe(true);
  });

  it.each(['2025-02-29', '2025-02-31', '2025-13-01', '2025-1-01', '20250101', ''])(
    'should reject "%s"',
    (raw) => {
      expect(isIsoCalendarDate(raw)).toBe(false);
    },
  );
});

describe('parseFiniteNumber', () => {
  it('should parse a finite number, negative and decimal included', () => {
    expect(parseFiniteNumber('-19.33', 'line 2: value')).toBe(-19.33);
    expect(parseFiniteNumber(' 20.875 ', 'line 2: value')).toBe(20.875);
  });

  it.each(['', '  ', 'abc', 'NaN', 'Infinity'])('should reject "%s"', (raw) => {
    expect(() => parseFiniteNumber(raw, 'NOAA LSA line 7: year')).toThrow(ProviderDataError);
    expect(() => parseFiniteNumber(raw, 'NOAA LSA line 7: year')).toThrow(
      `NOAA LSA line 7: year "${raw}" is not a finite number`,
    );
  });
});
