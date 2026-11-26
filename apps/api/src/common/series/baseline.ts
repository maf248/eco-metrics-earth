import { ProviderDataError } from '../errors/provider-error';

// Anchored so `11991-2020` or `1991-20201` never match.
const dashed = (baseline: { startYear: number; endYear: number }): RegExp =>
  new RegExp(`(?<!\\d)${baseline.startYear}[-–]${baseline.endYear}(?!\\d)`);

/**
 * The baseline is prose in the provider's description, not a field of the data.
 * A different reference period must become a failure, never a mislabelled chart.
 */
export function assertBaselineMatches(
  description: string | null,
  baseline: { startYear: number; endYear: number },
  what: string,
): void {
  const { startYear, endYear } = baseline;
  if (description === null) {
    throw new ProviderDataError(
      `${what} indicator has no short description to verify the ${startYear}-${endYear} baseline`,
    );
  }
  if (!dashed(baseline).test(description)) {
    throw new ProviderDataError(
      `${what} indicator description does not mention the expected ${startYear}-${endYear} baseline`,
    );
  }
}
