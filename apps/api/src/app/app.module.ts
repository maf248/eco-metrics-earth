import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { FallbackModule } from '../common/fallback/fallback.module';
import { createInternalKeyBypass } from '../common/throttler/internal-key-bypass';
import { AppConfigModule } from '../config/app-config.module';
import { AppConfigService } from '../config/app-config.service';
import { envValidationSchema } from '../config/env-validation.schema';
import { HealthModule } from '../health/health.module';
import { DataSourcesModule } from '../modules/data-sources/data-sources.module';
import { OwidModule } from '../modules/providers/owid/owid.module';
import { WaterFootprintModule } from '../modules/water-footprint/water-footprint.module';

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
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => ({
        throttlers: [{ ttl: 60_000, limit: 60 }],
        skipIf: createInternalKeyBypass(appConfig.internalApiKey),
      }),
    }),
    AppConfigModule,
    HealthModule,
    WaterFootprintModule,
    OwidModule,
    DataSourcesModule,
    FallbackModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
