export const TRACE_FIELD = 'logging.googleapis.com/trace';
export const SPAN_FIELD = 'logging.googleapis.com/spanId';

type HeaderValue = string | string[] | undefined;
export type HeaderBag = Readonly<Record<string, HeaderValue>>;

export interface TraceContext {
  /** 32 lowercase hex characters. */
  traceId: string;
  /** 16 lowercase hex characters. */
  spanId: string;
}

const TRACEPARENT_PATTERN = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;
const CLOUD_TRACE_PATTERN = /^([0-9a-f]{32})\/(\d+)(?:;o=[01])?$/;
const ALL_ZEROS_TRACE = '0'.repeat(32);
const ALL_ZEROS_SPAN = '0'.repeat(16);
const MAX_SPAN = 2n ** 64n - 1n;

function single(value: HeaderValue): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function fromTraceparent(value: string | undefined): TraceContext | undefined {
  const match = value === undefined ? null : TRACEPARENT_PATTERN.exec(value);
  if (!match || match[1] === ALL_ZEROS_TRACE || match[2] === ALL_ZEROS_SPAN) {
    return undefined;
  }
  return { traceId: match[1], spanId: match[2] };
}

function fromCloudTraceContext(value: string | undefined): TraceContext | undefined {
  const match = value === undefined ? null : CLOUD_TRACE_PATTERN.exec(value);
  if (!match || match[1] === ALL_ZEROS_TRACE) {
    return undefined;
  }
  const span = BigInt(match[2]);
  if (span === 0n || span > MAX_SPAN) {
    return undefined;
  }
  return { traceId: match[1], spanId: span.toString(16).padStart(16, '0') };
}

/**
 * Reads the trace context of a request: W3C `traceparent` first, then Google's
 * `X-Cloud-Trace-Context`. A malformed or all-zero value is ignored.
 */
export function parseTraceContext(headers: HeaderBag): TraceContext | undefined {
  return (
    fromTraceparent(single(headers['traceparent'])) ??
    fromCloudTraceContext(single(headers['x-cloud-trace-context']))
  );
}

/**
 * Cloud Logging correlation fields for a request. Empty without a project id or a valid trace
 * context, so local runs and tests simply omit them.
 */
export function buildTraceFields(
  projectId: string | undefined,
  headers: HeaderBag,
): Record<string, string> {
  if (!projectId) {
    return {};
  }
  const context = parseTraceContext(headers);
  if (!context) {
    return {};
  }
  return {
    [TRACE_FIELD]: `projects/${projectId}/traces/${context.traceId}`,
    [SPAN_FIELD]: context.spanId,
  };
}
