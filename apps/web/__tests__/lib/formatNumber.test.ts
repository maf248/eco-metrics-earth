import {
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
