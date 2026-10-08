import { createHash, timingSafeEqual } from 'node:crypto';

import { ExecutionContext } from '@nestjs/common';

const INTERNAL_KEY_HEADER = 'x-internal-api-key';

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/**
 * Constant-time check of a presented internal key against the configured secret.
 * Both sides are hashed first so the comparison always runs on equal-length buffers.
 * Returns false when no secret is configured or the presented value is not a single string.
 */
export function isValidInternalKey(provided: unknown, secret: string | undefined): boolean {
  if (!secret || typeof provided !== 'string' || provided === '') {
    return false;
  }

  return timingSafeEqual(digest(provided), digest(secret));
}

/** Builds a throttler `skipIf` callback that skips requests carrying the valid internal key. */
export function createInternalKeyBypass(
  secret: string | undefined,
): (context: ExecutionContext) => boolean {
  return (context: ExecutionContext): boolean => {
    if (!secret) {
      return false;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>();

    return isValidInternalKey(request.headers[INTERNAL_KEY_HEADER], secret);
  };
}
