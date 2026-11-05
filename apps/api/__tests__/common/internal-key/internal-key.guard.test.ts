import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AllowKeyless } from '../../../src/common/internal-key/allow-keyless.decorator';
import { InternalKeyGuard } from '../../../src/common/internal-key/internal-key.guard';
import { AppConfigService } from '../../../src/config/app-config.service';

const SECRET = 's'.repeat(32);

class KeylessController {
  @AllowKeyless()
  open(): void {}

  closed(): void {}
}

function createGuard(secret: string | undefined): InternalKeyGuard {
  return new InternalKeyGuard(new Reflector(), { internalApiKey: secret } as AppConfigService);
}

function contextFor(
  handler: () => void,
  headers: Record<string, string | string[] | undefined>,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => KeylessController,
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('InternalKeyGuard', () => {
  const controller = new KeylessController();

  it('should allow a request carrying the valid key', () => {
    const guard = createGuard(SECRET);
    expect(guard.canActivate(contextFor(controller.closed, { 'x-internal-api-key': SECRET }))).toBe(
      true,
    );
  });

  it('should reject a request without the key with 401', () => {
    const guard = createGuard(SECRET);
    expect(() => guard.canActivate(contextFor(controller.closed, {}))).toThrow(
      UnauthorizedException,
    );
  });

  it('should reject a wrong key with the same error as a missing key', () => {
    const guard = createGuard(SECRET);
    const capture = (headers: Record<string, string>): unknown => {
      try {
        guard.canActivate(contextFor(controller.closed, headers));
      } catch (error) {
        return error instanceof UnauthorizedException ? error.getResponse() : error;
      }
      return undefined;
    };

    const wrong = capture({ 'x-internal-api-key': 'wrong-value' });
    expect(wrong).toEqual(capture({}));
    expect(JSON.stringify(wrong)).not.toContain('wrong-value');
  });

  it('should reject a key of a different length without throwing anything else', () => {
    const guard = createGuard(SECRET);
    expect(() =>
      guard.canActivate(contextFor(controller.closed, { 'x-internal-api-key': 'short' })),
    ).toThrow(UnauthorizedException);
  });

  it('should reject an array header value', () => {
    const guard = createGuard(SECRET);
    expect(() =>
      guard.canActivate(contextFor(controller.closed, { 'x-internal-api-key': [SECRET, SECRET] })),
    ).toThrow(UnauthorizedException);
  });

  it('should allow a route marked with AllowKeyless without a key', () => {
    const guard = createGuard(SECRET);
    expect(guard.canActivate(contextFor(controller.open, {}))).toBe(true);
  });

  it('should allow every request when no key is configured', () => {
    const guard = createGuard(undefined);
    expect(guard.canActivate(contextFor(controller.closed, {}))).toBe(true);
  });
});
