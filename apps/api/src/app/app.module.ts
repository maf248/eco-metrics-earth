import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { DemoValidationController } from '../common/dto/demo-validation.controller';
import { FallbackModule } from '../common/fallback/fallback.module';
import { AppConfigService } from '../config/app-config.service';
import { envValidationSchema } from '../config/env-validation.schema';
import { HealthModule } from '../health/health.module';
import { WaterFootprintModule } from '../modules/water-footprint/water-footprint.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/api/.env',
      validationSchema: envValidationSchema,
      validationOptions: {
        libraryOptions: {
          allowUnknown: true,
          abortEarly: true,
        },
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    HealthModule,
    WaterFootprintModule,
    FallbackModule,
  ],
  controllers: [AppController, DemoValidationController],
  providers: [AppService, AppConfigService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
