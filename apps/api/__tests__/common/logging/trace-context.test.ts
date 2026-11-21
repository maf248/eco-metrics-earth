import {
  buildTraceFields,
  parseTraceContext,
  SPAN_FIELD,
  TRACE_FIELD,
} from '../../../src/common/logging/trace-context';

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const TRACEPARENT = `00-${TRACE_ID}-00f067aa0ba902b7-01`;
const CLOUD_TRACE_ID = '105445aa7843bc8bf206b12000100000';

describe('parseTraceContext', () => {
  it('should read a W3C traceparent', () => {
    expect(parseTraceContext({ traceparent: TRACEPARENT })).toEqual({
      traceId: TRACE_ID,
      spanId: '00f067aa0ba902b7',
    });
  });

  it('should read X-Cloud-Trace-Context and convert the decimal span to 16 hex characters', () => {
    expect(parseTraceContext({ 'x-cloud-trace-context': `${CLOUD_TRACE_ID}/1;o=1` })).toEqual({
      traceId: CLOUD_TRACE_ID,
      spanId: '0000000000000001',
    });
    expect(parseTraceContext({ 'x-cloud-trace-context': `${CLOUD_TRACE_ID}/255` })).toEqual({
      traceId: CLOUD_TRACE_ID,
      spanId: '00000000000000ff',
    });
  });

  it('should prefer traceparent when both headers are present', () => {
    const context = parseTraceContext({
      traceparent: TRACEPARENT,
      'x-cloud-trace-context': `${CLOUD_TRACE_ID}/1`,
    });
    expect(context?.traceId).toBe(TRACE_ID);
  });

  it('should fall back to X-Cloud-Trace-Context when traceparent is malformed', () => {
    const context = parseTraceContext({
      traceparent: 'garbage',
      'x-cloud-trace-context': `${CLOUD_TRACE_ID}/1`,
    });
    expect(context?.traceId).toBe(CLOUD_TRACE_ID);
  });

  it.each([
    ['an all-zero trace id', `00-${'0'.repeat(32)}-00f067aa0ba902b7-01`],
    ['an all-zero span id', `00-${TRACE_ID}-${'0'.repeat(16)}-01`],
    ['an unsupported version', `01-${TRACE_ID}-00f067aa0ba902b7-01`],
    ['uppercase hex', `00-${TRACE_ID.toUpperCase()}-00f067aa0ba902b7-01`],
    ['a short trace id', '00-abc-00f067aa0ba902b7-01'],
  ])('should ignore a traceparent with %s', (_label, value) => {
    expect(parseTraceContext({ traceparent: value })).toBeUndefined();
  });

  it.each([
    ['an out-of-range span', `${CLOUD_TRACE_ID}/${(2n ** 64n).toString()}`],
    ['a zero span', `${CLOUD_TRACE_ID}/0`],
    ['an all-zero trace id', `${'0'.repeat(32)}/1`],
    ['a non-numeric span', `${CLOUD_TRACE_ID}/abc`],
    ['a bad option suffix', `${CLOUD_TRACE_ID}/1;o=7`],
  ])('should ignore an X-Cloud-Trace-Context with %s', (_label, value) => {
    expect(parseTraceContext({ 'x-cloud-trace-context': value })).toBeUndefined();
  });

  it('should ignore a repeated header', () => {
    expect(parseTraceContext({ traceparent: [TRACEPARENT, TRACEPARENT] })).toBeUndefined();
  });

  it('should return undefined when no header is present', () => {
    expect(parseTraceContext({})).toBeUndefined();
  });
});

describe('buildTraceFields', () => {
  it('should build the Cloud Logging trace and span fields from a traceparent', () => {
    expect(buildTraceFields('my-project', { traceparent: TRACEPARENT })).toEqual({
      [TRACE_FIELD]: `projects/my-project/traces/${TRACE_ID}`,
      [SPAN_FIELD]: '00f067aa0ba902b7',
    });
  });

  it('should use the Cloud Logging field names', () => {
    expect(TRACE_FIELD).toBe('logging.googleapis.com/trace');
    expect(SPAN_FIELD).toBe('logging.googleapis.com/spanId');
  });

  it('should return an empty object without a project id', () => {
    expect(buildTraceFields(undefined, { traceparent: TRACEPARENT })).toEqual({});
  });

  it('should return an empty object without a valid trace context', () => {
    expect(buildTraceFields('my-project', {})).toEqual({});
    expect(
      buildTraceFields('my-project', { traceparent: `00-${'0'.repeat(32)}-00f067aa0ba902b7-01` }),
    ).toEqual({});
  });
});
