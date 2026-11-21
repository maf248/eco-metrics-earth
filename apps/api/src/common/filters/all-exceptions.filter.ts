import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';

import { ProviderError } from '../errors/provider-error';
import {
  DEFAULT_GROUP_WINDOW_MS,
  PROVIDER_GROUP_WINDOW_MS,
  SentryThrottle,
} from '../sentry/sentry-throttle';

const PROVIDER_ERROR_MESSAGE = 'Data provider unavailable or returned invalid data';
const PROVIDER_EVENT_GROUP = 'provider-unavailable';
const SENTRY_FLUSH_TIMEOUT_MS = 2000;

/** Describes an error and its `cause` chain as `Name: message` entries, outermost first. */
function describeCauseChain(error: unknown): string[] {
  const chain: string[] = [];
  let current: unknown = error;
  while (current !== undefined && chain.length < 10) {
    chain.push(current instanceof Error ? `${current.name}: ${current.message}` : String(current));
    current = current instanceof Error ? current.cause : undefined;
  }
  return chain;
}

/** The stack of an error, else `Name: message`; never empty or `undefined`. */
function describeException(exception: unknown): string {
  if (exception instanceof Error) {
    return exception.stack ?? `${exception.name}: ${exception.message}`;
  }
  try {
    return `Non-error thrown: ${String(exception)}`;
  } catch {
    // e.g. Object.create(null) has no toString
    return 'Non-error thrown (unprintable)';
  }
}

/**
 * Global exception filter that normalizes all errors into the
 * {@link ApiResponse} shape: `{ success: false, error: string, status: number }`.
 * Provider failures ({@link ProviderError}) become 502 with a constant body, so
 * provider URLs and internals never leak; other non-HttpExceptions (unexpected
 * runtime errors) are treated as 500.
 *
 * It is also the single Sentry capture point: every 5xx outcome (never a 4xx) is reported once,
 * throttled per event group, after the Cloud Logging entry is written.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly throttle: SentryThrottle = new SentryThrottle()) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof ProviderError) {
      const status = HttpStatus.BAD_GATEWAY;
      this.logFailure(exception, request, status, {
        error: PROVIDER_ERROR_MESSAGE,
        errorName: exception.name,
        errorMessage: exception.message,
        causes: describeCauseChain(exception),
      });
      await this.reportToSentry(exception, status);
      this.respond(response, status, { success: false, error: PROVIDER_ERROR_MESSAGE, status });
      return;
    }

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as string | { message: string | string[] })
        : 'Internal server error';

    // Unwrap NestJS validation errors (array of strings) into a single message
    const errorMessage =
      typeof message === 'object' && message !== null
        ? Array.isArray((message as { message: string | string[] }).message)
          ? (message as { message: string[] }).message.join('; ')
          : ((message as { message: string }).message ?? 'Unknown error')
        : String(message);

    if (status >= 500) {
      this.logFailure(exception, request, status, { error: errorMessage });
      await this.reportToSentry(exception, status);
    }

    this.respond(response, status, { success: false, error: errorMessage, status });
  }

  /**
   * Writes the response unless it was already started. `catch` is async and Nest does not await
   * it, so a throw here would be an unhandled rejection that crashes the process.
   */
  private respond(response: Response, status: number, body: unknown): void {
    if (response.headersSent) {
      return;
    }
    response.status(status).json(body);
  }

  /**
   * Logs a 5xx outcome as one entry whose `message` is the stack (so Cloud Error Reporting groups
   * it) or `Name: message` when there is none. This is the only place exceptions are logged.
   */
  private logFailure(
    exception: unknown,
    request: Request,
    status: number,
    extra: Record<string, unknown>,
  ): void {
    this.logger.error(
      { status, method: request.method, path: request.url, ...extra },
      describeException(exception),
    );
  }

  /**
   * Sends one 5xx to Sentry when the throttle admits its event group, then waits (bounded) for the
   * transport, because Cloud Run throttles the CPU once the response is written. Never throws: a
   * Sentry failure must not change the response.
   */
  private async reportToSentry(exception: unknown, status: number): Promise<void> {
    try {
      if (exception instanceof ProviderError) {
        if (!this.throttle.admit(PROVIDER_EVENT_GROUP, PROVIDER_GROUP_WINDOW_MS)) {
          return;
        }
        Sentry.captureException(exception, {
          fingerprint: [PROVIDER_EVENT_GROUP],
          level: 'warning',
          tags: { status: String(status) },
        });
      } else {
        const group =
          exception instanceof Error
            ? `${exception.name}: ${exception.message}`
            : 'non-error-thrown';
        if (!this.throttle.admit(group, DEFAULT_GROUP_WINDOW_MS)) {
          return;
        }
        Sentry.captureException(exception);
      }
      await Sentry.flush(SENTRY_FLUSH_TIMEOUT_MS);
    } catch {
      // Sentry is an additional view: ignore its failures.
    }
  }
}
