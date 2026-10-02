import { Module } from '@nestjs/common';

import { FallbackController } from './fallback.controller';

/**
 * Module that provides the global catch-all fallback route.
 *
 * It is imported last in {@link AppModule} so that its wildcard route is
 * registered after all real application routes and only handles unmapped
 * paths. This restores the pre-NestJS-12 JSON 404 behaviour where unknown
 * routes produced a JSON 404 through the global exception filter.
 */
@Module({
  controllers: [FallbackController],
})
export class FallbackModule {}
