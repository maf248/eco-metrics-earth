import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

import { OutboundHttpModule } from '../../../common/http/outbound-http.module';
import { AppConfigModule } from '../../../config/app-config.module';
import { AppConfigService } from '../../../config/app-config.service';

import { CopernicusClimatePulseClient } from './copernicus-climate-pulse-client.service';
import { CopernicusClimatePulseStatus } from './copernicus-climate-pulse-status';

@Module({
  imports: [
    AppConfigModule,
    OutboundHttpModule,
    CacheModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => ({
        ttl: appConfig.copernicusClimatePulseCacheTtlSeconds * 1000,
      }),
    }),
  ],
  providers: [CopernicusClimatePulseClient, CopernicusClimatePulseStatus],
  exports: [CopernicusClimatePulseClient, CopernicusClimatePulseStatus],
})
export class CopernicusClimatePulseModule {}
