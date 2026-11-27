import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

import { OutboundHttpModule } from '../../../common/http/outbound-http.module';
import { AppConfigModule } from '../../../config/app-config.module';
import { AppConfigService } from '../../../config/app-config.service';

import { NoaaLsaClient } from './noaa-lsa-client.service';
import { NoaaLsaStatus } from './noaa-lsa-status';

@Module({
  imports: [
    AppConfigModule,
    OutboundHttpModule,
    CacheModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => ({
        ttl: appConfig.noaaLsaCacheTtlSeconds * 1000,
      }),
    }),
  ],
  providers: [NoaaLsaClient, NoaaLsaStatus],
  exports: [NoaaLsaClient, NoaaLsaStatus],
})
export class NoaaLsaModule {}
