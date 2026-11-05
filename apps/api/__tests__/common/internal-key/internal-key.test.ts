import { ExecutionContext } from '@nestjs/common';

import { isKeyedRequest, isValidInternalKey } from '../../../src/common/internal-key/internal-key';

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

describe('isKeyedRequest', () => {
  it('should return true for a request carrying the valid key', () => {
    expect(isKeyedRequest(contextWithHeaders({ 'x-internal-api-key': SECRET }), SECRET)).toBe(true);
  });

  it('should return false for a request without the header', () => {
    expect(isKeyedRequest(contextWithHeaders({}), SECRET)).toBe(false);
  });

  it('should return false for a wrong key', () => {
    expect(isKeyedRequest(contextWithHeaders({ 'x-internal-api-key': 'wrong' }), SECRET)).toBe(
      false,
    );
  });

  it('should return false for a header holding multiple values', () => {
    expect(
      isKeyedRequest(contextWithHeaders({ 'x-internal-api-key': [SECRET, SECRET] }), SECRET),
    ).toBe(false);
  });

  it('should return true for every request when no secret is configured', () => {
    expect(isKeyedRequest(contextWithHeaders({}), undefined)).toBe(true);
    expect(
      isKeyedRequest(contextWithHeaders({ 'x-internal-api-key': 'anything' }), undefined),
    ).toBe(true);
  });
});
