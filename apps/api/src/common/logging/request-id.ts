import { randomUUID } from 'node:crypto';

import { HeaderBag, parseTraceContext } from './trace-context';

export const REQUEST_ID_HEADER = 'X-Request-ID';

const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;

/** True for a single string of 8-64 characters from `A-Za-z0-9._-`. */
export function isSafeRequestId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_REQUEST_ID_PATTERN.test(value);
}

/**
 * Resolves the id of a request: a safe incoming `X-Request-ID`, else the trace id of the trace
 * context, else a new UUID. An unsafe incoming value is ignored and never reflected.
 */
export function resolveRequestId(headers: HeaderBag): string {
  const incoming = headers[REQUEST_ID_HEADER.toLowerCase()];
  if (isSafeRequestId(incoming)) {
    return incoming;
  }
  return parseTraceContext(headers)?.traceId ?? randomUUID();
}
