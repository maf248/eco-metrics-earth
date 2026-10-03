import { Inject, Injectable } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';

import {
  OutboundHttpError,
  OutboundHttpStatusError,
  OutboundNetworkError,
  OutboundTimeoutError,
} from './outbound-http-errors';

export type OutboundFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export const OUTBOUND_FETCH = Symbol('OUTBOUND_FETCH');

export const USER_AGENT = 'eco-metrics-earth-api (+https://github.com/maf248/eco-metrics-earth)';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

@Injectable()
export class OutboundHttpClient {
  private static readonly RETRY_DELAYS_MS = [500, 1000];
  private static readonly MAX_ATTEMPTS = 3;

  constructor(
    @Inject(OUTBOUND_FETCH)
    private readonly outboundFetch: OutboundFetch,
    private readonly appConfig: AppConfigService,
  ) {}

  async getText(url: string): Promise<string> {
    return this.execute(url);
  }

  /**
   * Fetches and parses a JSON body. A body that is not valid JSON is not a
   * transient failure, so the resulting `SyntaxError` propagates without retry
   * for the caller to map onto its own error contract.
   */
  async getJson(url: string): Promise<unknown> {
    const body = await this.execute(url);
    return JSON.parse(body) as unknown;
  }

  private async execute(url: string): Promise<string> {
    let lastError: OutboundHttpError | undefined;

    for (let attempt = 0; attempt < OutboundHttpClient.MAX_ATTEMPTS; attempt++) {
      try {
        return await this.attemptOnce(url);
      } catch (error) {
        if (!(error instanceof OutboundHttpError)) {
          throw error;
        }

        lastError = error;

        if (!this.isRetryable(error) || attempt >= OutboundHttpClient.RETRY_DELAYS_MS.length) {
          throw error;
        }

        await delay(OutboundHttpClient.RETRY_DELAYS_MS[attempt]);
      }
    }

    throw lastError ?? new OutboundHttpError(`Outbound request failed: ${url}`, url);
  }

  // The body is read inside the attempt so the per-attempt timeout and the
  // retry policy also cover an upstream that stalls after sending headers.
  private async attemptOnce(url: string): Promise<string> {
    try {
      const response = await this.outboundFetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
        },
        signal: AbortSignal.timeout(this.appConfig.owidHttpTimeoutMs),
      });

      if (!response.ok) {
        throw new OutboundHttpStatusError(url, response.status);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof OutboundHttpError) {
        throw error;
      }

      if (this.isTimeoutError(error)) {
        throw new OutboundTimeoutError(url, error);
      }

      throw new OutboundNetworkError(url, error);
    }
  }

  private isRetryable(error: OutboundHttpError): boolean {
    if (error instanceof OutboundHttpStatusError) {
      return error.status === 408 || error.status === 429 || error.status >= 500;
    }

    return true;
  }

  private isTimeoutError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'TimeoutError';
  }
}
