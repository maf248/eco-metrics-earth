import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

import { OutboundHttpModule } from '../../../common/http/outbound-http.module';
import { AppConfigModule } from '../../../config/app-config.module';
import { AppConfigService } from '../../../config/app-config.service';

import { OwidClient } from './owid-client.service';
import { OwidProviderStatus } from './owid-provider-status';

@Module({
  imports: [
    AppConfigModule,
    OutboundHttpModule,
    CacheModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => ({
        ttl: appConfig.owidCacheTtlSeconds * 1000,
      }),
    }),
  ],
  providers: [OwidClient, OwidProviderStatus],
  exports: [OwidClient, OwidProviderStatus],
})
export class OwidModule {}
