import { INestApplication, ValidationPipe } from '@nestjs/common';

import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';

/**
 * Registers the global validation pipe and exception filter.
 * Single source of truth shared by `main.ts` and the integration tests.
 */
export function applyGlobalPipeline(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}
