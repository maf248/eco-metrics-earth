import { INTERNAL_KEY_HEADER } from '../internal-key/internal-key';

/**
 * Pino `redact` paths. The serializers already keep headers out of the logs; this is defense in
 * depth against a future serializer or a `logger.info({ req })` call.
 */
export const REDACT_PATHS: readonly string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  `req.headers["${INTERNAL_KEY_HEADER}"]`,
  'res.headers["set-cookie"]',
];
