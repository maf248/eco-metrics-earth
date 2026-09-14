import { All, Controller, NotFoundException, Req } from '@nestjs/common';
import { Request } from 'express';

/**
 * Catch-all fallback controller.
 *
 * NestJS 12 reworked HTTP adapter error mapping: unmapped routes no longer
 * generate a NestJS {@link NotFoundException} inside the pipeline, so the
 * global {@link AllExceptionsFilter} receives Express's default HTML 404
 * instead of a JSON response. This controller restores the baseline behaviour
 * by matching every unhandled path, throwing {@link NotFoundException} with
 * Express's original "Cannot METHOD path" message, and letting the existing
 * global exception filter format the JSON response.
 */
@Controller()
export class FallbackController {
  @All('{*path}')
  fallback(@Req() req: Request): never {
    throw new NotFoundException(`Cannot ${req.method} ${req.originalUrl}`);
  }
}
