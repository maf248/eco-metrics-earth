const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

/** Formats an ISO 8601 timestamp as a UTC date, so server and client output are identical. */
export function formatUtcDate(iso: string): string {
  return formatter.format(new Date(iso));
}
