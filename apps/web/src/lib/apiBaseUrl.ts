/**
 * Returns the BFF base URL with no trailing slash.
 * Reads API_BASE_URL and falls back to http://localhost:3001/api/v1.
 * Server-side only — do not prefix with NEXT_PUBLIC_.
 */
export function apiBaseUrl(): string {
  const trimmed = process.env.API_BASE_URL?.trim();
  const resolved = trimmed ? trimmed : 'http://localhost:3001/api/v1';
  return resolved.replace(/\/$/, '');
}
