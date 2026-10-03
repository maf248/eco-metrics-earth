/**
 * Illustrative reference values for contextual equivalents.
 * These are presentation-only and are not part of the cited dataset.
 */
export const SHOWER_LITERS = 65;
export const BATHTUB_LITERS = 150;

const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/**
 * Sub-litre values (e.g. 0.00026 L per AI prompt) round to "0" under the main
 * formatter's single-decimal rule, so they are formatted by significant digits
 * instead.
 */
const subLiterFormatter = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2 });

/**
 * Formats a number of liters with a single decimal place when needed, keeping
 * values below 1 L readable rather than collapsing them to zero.
 */
export function formatLiters(liters: number): string {
  if (liters !== 0 && Math.abs(liters) < 1) {
    return subLiterFormatter.format(liters);
  }
  return formatter.format(liters);
}

function formatQuotient(value: number): string {
  return value >= 100 ? formatter.format(Math.round(value)) : formatter.format(value);
}

function pluralize(displayed: string, singular: string, plural: string): string {
  return displayed === '1' ? singular : plural;
}

/**
 * Converts a water-footprint value into illustrative shower/bathtub equivalents.
 *
 * - null → '—'
 * - < 65 L → 'under 1 shower'
 * - 65–149 L → '≈ {n} shower(s)'
 * - ≥ 150 L → '≈ {n} showers · ≈ {m} bathtubs'
 *
 * Quotients ≥ 100 are shown as integers; smaller values keep one decimal.
 * Pluralization follows the displayed (rounded) value, not the raw quotient.
 */
export function formatWaterFootprintEquivalents(liters: number | null): string {
  if (liters === null) {
    return '—';
  }

  if (liters < SHOWER_LITERS) {
    return 'under 1 shower';
  }

  const showers = liters / SHOWER_LITERS;

  if (liters < BATHTUB_LITERS) {
    const formattedShowers = formatQuotient(showers);
    return `≈ ${formattedShowers} ${pluralize(formattedShowers, 'shower', 'showers')}`;
  }

  const bathtubs = liters / BATHTUB_LITERS;
  const formattedShowers = formatQuotient(showers);
  const formattedBathtubs = formatQuotient(bathtubs);
  return `≈ ${formattedShowers} showers · ≈ ${formattedBathtubs} ${pluralize(
    formattedBathtubs,
    'bathtub',
    'bathtubs',
  )}`;
}
