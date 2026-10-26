import { formatAnomaly, formatAnomalyAxis } from '@/lib/formatNumber';

describe('formatAnomaly', () => {
  it.each([
    [0.594, '+0.59'],
    [-0.451, '−0.45'],
    [0, '0.00'],
    [1.2, '+1.20'],
  ])('should format %s as %s', (value, expected) => {
    expect(formatAnomaly(value)).toBe(expected);
  });

  it('should show a value that rounds to zero without a sign', () => {
    expect(formatAnomaly(-0.001)).toBe('0.00');
    expect(formatAnomaly(0.001)).toBe('0.00');
  });

  it('should use the real minus sign and never the ASCII hyphen', () => {
    const text = formatAnomaly(-0.451);

    expect(text).toContain('−');
    expect(text).not.toContain('-');
  });
});

describe('formatAnomalyAxis', () => {
  it.each([
    [0.5, '+0.5'],
    [-1, '−1'],
    [0, '0'],
    [-0.25, '−0.3'],
  ])('should format %s as %s', (value, expected) => {
    expect(formatAnomalyAxis(value)).toBe(expected);
  });

  it('should not contain the ASCII hyphen', () => {
    expect(formatAnomalyAxis(-2.5)).not.toContain('-');
  });
});
