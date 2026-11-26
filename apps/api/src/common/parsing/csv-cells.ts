import { ProviderDataError } from '../errors/provider-error';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True for an ISO 8601 calendar date (`YYYY-MM-DD`) that exists: `2025-02-31`
 * parses to 3 March, so only a date that survives the round trip counts.
 */
export function isIsoCalendarDate(raw: string): boolean {
  if (!ISO_DATE_PATTERN.test(raw)) {
    return false;
  }
  const time = Date.parse(`${raw}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().startsWith(raw);
}

/**
 * A CSV cell as a finite number. A blank cell, `NaN` or an infinity throws
 * `ProviderDataError` with `where` (for example `NOAA LSA line 12: year`) as
 * the start of the message.
 */
export function parseFiniteNumber(raw: string, where: string): number {
  const value = raw.trim() === '' ? Number.NaN : Number(raw);
  if (!Number.isFinite(value)) {
    throw new ProviderDataError(`${where} "${raw}" is not a finite number`);
  }
  return value;
}
