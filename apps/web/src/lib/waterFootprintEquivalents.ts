/**
 * Illustrative reference values for contextual equivalents.
 * These are presentation-only and are not part of the cited dataset.
 */
export const SHOWER_LITERS = 65;
export const BATHTUB_LITERS = 150;

const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/**
 * Formats a number of liters with a single decimal place when needed.
 */
export function formatLiters(liters: number): string {
  return formatter.format(liters);
}

function formatQuotient(value: number): string {
  return value >= 100 ? formatter.format(Math.round(value)) : formatter.format(value);
}

function pluralize(value: number, singular: string, plural: string): string {
  return value === 1 ? singular : plural;
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
    return `≈ ${formatQuotient(showers)} ${pluralize(showers, 'shower', 'showers')}`;
  }

  const bathtubs = liters / BATHTUB_LITERS;
  return `≈ ${formatQuotient(showers)} showers · ≈ ${formatQuotient(bathtubs)} ${pluralize(
    bathtubs,
    'bathtub',
    'bathtubs',
  )}`;
}
