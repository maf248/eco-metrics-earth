import { ExecutionContext } from '@nestjs/common';

import {
  createInternalKeyBypass,
  isValidInternalKey,
} from '../../../src/common/throttler/internal-key-bypass';

const SECRET = 's'.repeat(32);

function contextWithHeaders(headers: Record<string, string | string[] | undefined>) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('isValidInternalKey', () => {
  it('should return true when the provided key matches the secret', () => {
    expect(isValidInternalKey(SECRET, SECRET)).toBe(true);
  });

  it('should return false when the key differs', () => {
    expect(isValidInternalKey('x'.repeat(32), SECRET)).toBe(false);
  });

  it('should return false without throwing when the key has a different length', () => {
    expect(isValidInternalKey('short', SECRET)).toBe(false);
    expect(isValidInternalKey(`${SECRET}extra`, SECRET)).toBe(false);
  });

  it('should return false for an empty header value', () => {
    expect(isValidInternalKey('', SECRET)).toBe(false);
  });

  it('should return false for an array header value', () => {
    expect(isValidInternalKey([SECRET], SECRET)).toBe(false);
  });

  it('should return false for a missing header value', () => {
    expect(isValidInternalKey(undefined, SECRET)).toBe(false);
  });

  it('should return false when no secret is configured', () => {
    expect(isValidInternalKey('anything', undefined)).toBe(false);
    expect(isValidInternalKey('', '')).toBe(false);
  });
});

describe('createInternalKeyBypass', () => {
  it('should skip throttling when the header carries the valid key', () => {
    const skipIf = createInternalKeyBypass(SECRET);
    expect(skipIf(contextWithHeaders({ 'x-internal-api-key': SECRET }))).toBe(true);
  });

  it('should not skip when the header is missing', () => {
    const skipIf = createInternalKeyBypass(SECRET);
    expect(skipIf(contextWithHeaders({}))).toBe(false);
  });

  it('should not skip when the header holds multiple values', () => {
    const skipIf = createInternalKeyBypass(SECRET);
    expect(skipIf(contextWithHeaders({ 'x-internal-api-key': [SECRET, SECRET] }))).toBe(false);
  });

  it('should never skip when no secret is configured', () => {
    const skipIf = createInternalKeyBypass(undefined);
    expect(skipIf(contextWithHeaders({ 'x-internal-api-key': '' }))).toBe(false);
    expect(skipIf(contextWithHeaders({ 'x-internal-api-key': 'anything' }))).toBe(false);
  });
});
