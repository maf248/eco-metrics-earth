import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter that normalizes all errors into the
 * {@link ApiResponse} shape: `{ success: false, error: string, status: number }`.
 * Non-HttpExceptions (unexpected runtime errors) are treated as 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

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
