import type { IncomingMessage } from 'node:http';

const HEALTH_PATH = '/api/v1/health';

/**
 * True for the liveness probe (`GET /api/v1/health`, query string and trailing slash ignored).
 * `originalUrl` is preferred because middleware mounted on a path can see a rewritten `url`.
 */
export function isHealthProbe(req: IncomingMessage & { originalUrl?: string }): boolean {
  if (req.method !== 'GET') {
    return false;
  }
  const raw = req.originalUrl ?? req.url ?? '';
  const pathname = raw.split('?')[0].replace(/\/+$/, '');
  // Express routing is case-insensitive, so /API/V1/HEALTH is the same probe.
  return pathname.toLowerCase() === HEALTH_PATH;
}
