export class OutboundHttpError extends Error {
  constructor(
    message: string,
    readonly url: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'OutboundHttpError';
  }
}

export class OutboundTimeoutError extends OutboundHttpError {
  constructor(url: string, cause?: unknown) {
    super(`Outbound request timed out: ${url}`, url, { cause });
    this.name = 'OutboundTimeoutError';
  }
}

export class OutboundNetworkError extends OutboundHttpError {
  constructor(url: string, cause?: unknown) {
    super(`Outbound network error for ${url}`, url, { cause });
    this.name = 'OutboundNetworkError';
  }
}

export class OutboundHttpStatusError extends OutboundHttpError {
  constructor(
    url: string,
    readonly status: number,
  ) {
    super(`Outbound request failed with status ${status}: ${url}`, url);
    this.name = 'OutboundHttpStatusError';
  }
}
