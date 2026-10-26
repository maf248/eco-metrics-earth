import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { ProviderError } from '../errors/provider-error';

const PROVIDER_ERROR_MESSAGE = 'Data provider unavailable or returned invalid data';

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

/**
 * Global exception filter that normalizes all errors into the
 * {@link ApiResponse} shape: `{ success: false, error: string, status: number }`.
 * Provider failures ({@link ProviderError}) become 502 with a constant body, so
 * provider URLs and internals never leak; other non-HttpExceptions (unexpected
 * runtime errors) are treated as 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof ProviderError) {
      const status = HttpStatus.BAD_GATEWAY;
      this.logger.error(
        {
          status,
          error: PROVIDER_ERROR_MESSAGE,
          path: request.url,
          method: request.method,
          errorName: exception.name,
          errorMessage: exception.message,
          causes: describeCauseChain(exception),
        },
        exception.stack,
      );
      response.status(status).json({ success: false, error: PROVIDER_ERROR_MESSAGE, status });
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
      this.logger.error(
        { status, error: errorMessage, path: request.url, method: request.method },
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      error: errorMessage,
      status,
    });
  }
}
