/**
 * Returns the canonical base URL for the web app with no trailing slash.
 * Reads NEXT_PUBLIC_SITE_URL and falls back to http://localhost:3000.
 */
export function siteUrl(): string {
  const trimmed = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const resolved = trimmed ? trimmed : 'http://localhost:3000';
  return resolved.replace(/\/$/, '');
}
