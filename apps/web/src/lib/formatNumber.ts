// A fixed locale, so server and client render identical text (no hydration mismatch).
const LOCALE = 'en-US';

const compactFormatter = new Intl.NumberFormat(LOCALE, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Used for per-capita values that are zero or round to 0.00 in the payload. */
export const TINY_PER_CAPITA_LABEL = '< 0.01';

function fractionDigitsForTotal(value: number): number {
  const magnitude = Math.abs(value);
  if (magnitude >= 100) return 0;
  if (magnitude >= 1) return 1;
  return 3;
}

/** Million tonnes of CO2: fewer decimals as the value grows, e.g. `37,800`, `29.9`, `0.004`. */
export function formatTotal(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: fractionDigitsForTotal(value),
  }).format(value);
}

/** Tonnes of CO2 per person with two decimals; never shows "0.00" for a positive or zero value. */
export function formatPerCapita(value: number): string {
  if (value < 0.01) {
    return TINY_PER_CAPITA_LABEL;
  }
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Short axis labels such as `1.5K`. */
export function formatCompact(value: number): string {
  return compactFormatter.format(value);
}

const shareFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Label of a positive share that rounds to zero at one decimal. */
const TINY_SHARE_LABEL = '< 0.1';

/** A share of a total with one decimal: `33.0`, `8.5`; `< 0.1` below 0.05 and `0.0` for zero. */
export function formatShare(value: number): string {
  if (value > 0 && value < 0.05) {
    return TINY_SHARE_LABEL;
  }
  return shareFormatter.format(value);
}

function fractionDigitsForTwh(value: number): number {
  const magnitude = Math.abs(value);
  if (magnitude >= 100) return 0;
  if (magnitude >= 1) return 1;
  return 2;
}

/** Rounds to the precision its own magnitude calls for; may cross into the next band (99.96 -> 100). */
function roundTwh(value: number): number {
  const factor = 10 ** fractionDigitsForTwh(value);
  return Math.round(value * factor) / factor;
}

/** Terawatt-hours: no decimals from 100 up, one from 1, two below: `10,539`, `62.2`, `0.01`. */
export function formatTwh(value: number): string {
  // Decimals follow the rounded value, so 99.96 reads `100` and not `100.0`.
  const digits = fractionDigitsForTwh(roundTwh(value));
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

// Real minus sign (U+2212): never read, or wrapped, as a hyphen separator.
const MINUS_SIGN = '−';

const anomalyFormatter = new Intl.NumberFormat(LOCALE, {
  signDisplay: 'exceptZero',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const anomalyAxisFormatter = new Intl.NumberFormat(LOCALE, {
  signDisplay: 'exceptZero',
  maximumFractionDigits: 1,
});

/** Temperature anomaly with two decimals and an explicit sign: `+0.59`, `−0.45`, `0.00`. */
export function formatAnomaly(value: number): string {
  return anomalyFormatter.format(value).replace('-', MINUS_SIGN);
}

/** Short signed axis label with at most one decimal: `+0.5`, `−1`, `0`. */
export function formatAnomalyAxis(value: number): string {
  return anomalyAxisFormatter.format(value).replace('-', MINUS_SIGN);
}
