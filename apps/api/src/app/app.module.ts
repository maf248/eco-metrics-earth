import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { FallbackModule } from '../common/fallback/fallback.module';
import { InternalKeyGuard } from '../common/internal-key/internal-key.guard';
import { buildThrottlerOptions } from '../common/internal-key/throttler-options';
import { AppConfigModule } from '../config/app-config.module';
import { AppConfigService } from '../config/app-config.service';
import { envValidationSchema } from '../config/env-validation.schema';
import { HealthModule } from '../health/health.module';
import { Co2EmissionsModule } from '../modules/co2-emissions/co2-emissions.module';
import { DataSourcesModule } from '../modules/data-sources/data-sources.module';
import { EnergySourcesModule } from '../modules/energy-sources/energy-sources.module';
import { GlobalTemperatureModule } from '../modules/global-temperature/global-temperature.module';
import { OwidModule } from '../modules/providers/owid/owid.module';
import { WasteRecyclingModule } from '../modules/waste-recycling/waste-recycling.module';
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
      useFactory: (appConfig: AppConfigService) => buildThrottlerOptions(appConfig),
    }),
    AppConfigModule,
    HealthModule,
    WaterFootprintModule,
    WasteRecyclingModule,
    OwidModule,
    Co2EmissionsModule,
    GlobalTemperatureModule,
    EnergySourcesModule,
    DataSourcesModule,
    FallbackModule,
  ],
  // Order matters: the throttler runs first so rejected anonymous requests are counted too.
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: InternalKeyGuard },
  ],
})
export class AppModule {}
