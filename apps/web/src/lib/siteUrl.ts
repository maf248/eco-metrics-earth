/**
 * Returns the canonical base URL for the web app with no trailing slash.
 * Reads NEXT_PUBLIC_SITE_URL and falls back to http://localhost:3000.
 */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  const resolved = raw && raw.trim() !== '' ? raw : 'http://localhost:3000';
  return resolved.replace(/\/$/, '');
}
