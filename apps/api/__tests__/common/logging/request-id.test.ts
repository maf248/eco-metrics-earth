import {
  isSafeRequestId,
  REQUEST_ID_HEADER,
  resolveRequestId,
} from '../../../src/common/logging/request-id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const TRACEPARENT = `00-${TRACE_ID}-00f067aa0ba902b7-01`;

describe('isSafeRequestId', () => {
  it.each(['web-1234.abcd_EF', 'a'.repeat(8), 'a'.repeat(64)])('should accept %s', (value) => {
    expect(isSafeRequestId(value)).toBe(true);
  });

  it.each([
    ['too short', 'abcdefg'],
    ['too long', 'a'.repeat(65)],
    ['containing a space', 'abcd efgh'],
    ['non-ASCII', 'abcdefghé'],
    ['a repeated header joined by a comma', 'abcdefgh, ijklmnop'],
    ['containing a line break', 'abcdefgh\nX-Injected: 1'],
    ['empty', ''],
  ])('should reject a value %s', (_label, value) => {
    expect(isSafeRequestId(value)).toBe(false);
  });

  it('should reject non-string values', () => {
    expect(isSafeRequestId(undefined)).toBe(false);
    expect(isSafeRequestId(['abcdefgh', 'ijklmnop'])).toBe(false);
    expect(isSafeRequestId(12345678)).toBe(false);
  });
});

describe('resolveRequestId', () => {
  it('should expose the canonical response header name', () => {
    expect(REQUEST_ID_HEADER).toBe('X-Request-ID');
  });

  it('should return a safe incoming X-Request-ID', () => {
    expect(resolveRequestId({ 'x-request-id': 'web-1234.abcd_EF' })).toBe('web-1234.abcd_EF');
  });

  it('should ignore an unsafe X-Request-ID and fall back to a generated UUID', () => {
    const id = resolveRequestId({ 'x-request-id': 'has space in it' });
    expect(id).toMatch(UUID_V4);
  });

  it('should ignore a repeated X-Request-ID header', () => {
    const id = resolveRequestId({ 'x-request-id': ['abcdefgh', 'ijklmnop'] });
    expect(id).toMatch(UUID_V4);
  });

  it('should use the trace id when no request id is sent', () => {
    expect(resolveRequestId({ traceparent: TRACEPARENT })).toBe(TRACE_ID);
  });

  it('should prefer a safe X-Request-ID over the trace id', () => {
    expect(resolveRequestId({ 'x-request-id': 'web-1234.abcd_EF', traceparent: TRACEPARENT })).toBe(
      'web-1234.abcd_EF',
    );
  });

  it('should generate a different UUID v4 per call when nothing is sent', () => {
    const first = resolveRequestId({});
    const second = resolveRequestId({});
    expect(first).toMatch(UUID_V4);
    expect(second).toMatch(UUID_V4);
    expect(first).not.toBe(second);
  });
});
