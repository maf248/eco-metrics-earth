import { SetMetadata } from '@nestjs/common';

export const ALLOW_KEYLESS_KEY = 'allowKeyless';

/** Marks a route as reachable without `X-Internal-Api-Key` (only the liveness probe uses it). */
export const AllowKeyless = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_KEYLESS_KEY, true);
