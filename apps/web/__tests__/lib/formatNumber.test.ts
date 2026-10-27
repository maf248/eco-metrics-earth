import {
  formatShare,
  formatTwh,
  formatCompact,
  formatPerCapita,
  formatTotal,
  TINY_PER_CAPITA_LABEL,
} from '@/lib/formatNumber';

describe('formatTotal', () => {
  it.each([
    [37800.4, '37,800'],
    [170.123, '170'],
    [29.921, '29.9'],
    [0.004, '0.004'],
    [0, '0'],
  ])('should format %s as %s', (value, expected) => {
    expect(formatTotal(value)).toBe(expected);
  });
});

describe('formatPerCapita', () => {
  it.each([
    [4.66, '4.66'],
    [13.8, '13.80'],
    [1234.5, '1,234.50'],
    [0.01, '0.01'],
  ])('should format %s as %s', (value, expected) => {
    expect(formatPerCapita(value)).toBe(expected);
  });

  it.each([0, 0.004, 0.0099])('should show "%s" as the tiny label, never "0.00"', (value) => {
    expect(formatPerCapita(value)).toBe(TINY_PER_CAPITA_LABEL);
    expect(TINY_PER_CAPITA_LABEL).toBe('< 0.01');
  });
});

describe('formatCompact', () => {
  it('should abbreviate large numbers', () => {
    expect(formatCompact(1500)).toBe('1.5K');
  });
});

describe('formatShare', () => {
  it.each([
    [32.957996, '33.0'],
    [0, '0.0'],
    [0.003, '< 0.1'],
    [100, '100.0'],
    [8.54, '8.5'],
    [0.05, '0.1'],
  ])('should format %p as %p', (value, expected) => {
    expect(formatShare(value)).toBe(expected);
  });
});

describe('formatTwh', () => {
  it.each([
    [10538.94, '10,539'],
    [100, '100'],
    [62.21, '62.2'],
    [0.01, '0.01'],
    [0, '0.00'],
    [99.96, '100'],
    [99.94, '99.9'],
    [0.996, '1.0'],
  ])('should format %p as %p', (value, expected) => {
    expect(formatTwh(value)).toBe(expected);
  });
});
