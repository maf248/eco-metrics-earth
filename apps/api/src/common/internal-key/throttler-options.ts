import { ThrottlerModuleOptions } from '@nestjs/throttler';

import { AppConfigService } from '../../config/app-config.service';

import { isKeyedRequest } from './internal-key';

export const KEYED_LIMIT = 300;
export const ANONYMOUS_LIMIT = 30;
export const THROTTLE_TTL_MS = 60_000;

/**
 * Two-tier throttler options shared by `AppModule` and the tests. Each throttler skips the other
 * tier's requests. `limits` exists only so tests can use small budgets with the same wiring.
 */
export function buildThrottlerOptions(
  appConfig: Pick<AppConfigService, 'internalApiKey'>,
  limits: { keyed: number; anonymous: number } = {
    keyed: KEYED_LIMIT,
    anonymous: ANONYMOUS_LIMIT,
  },
): ThrottlerModuleOptions {
  return {
    throttlers: [
      {
        name: 'default',
        ttl: THROTTLE_TTL_MS,
        limit: limits.keyed,
        skipIf: (context) => !isKeyedRequest(context, appConfig.internalApiKey),
      },
      {
        name: 'anonymous',
        ttl: THROTTLE_TTL_MS,
        limit: limits.anonymous,
        skipIf: (context) => isKeyedRequest(context, appConfig.internalApiKey),
      },
    ],
  };
}
