import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppConfigService } from '../../config/app-config.service';

import { ALLOW_KEYLESS_KEY } from './allow-keyless.decorator';
import { isKeyedRequest } from './internal-key';

/**
 * Rejects with 401 every request without a valid `X-Internal-Api-Key`, except routes marked
 * `@AllowKeyless()`. When no key is configured (never in production) every request is allowed.
 * The response never says whether the key was missing or wrong and never echoes a value.
 */
@Injectable()
export class InternalKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly appConfig: AppConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const allowKeyless = this.reflector.getAllAndOverride<boolean | undefined>(ALLOW_KEYLESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (allowKeyless || isKeyedRequest(context, this.appConfig.internalApiKey)) {
      return true;
    }

    throw new UnauthorizedException();
  }
}
