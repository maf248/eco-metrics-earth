import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

import { OutboundHttpModule } from '../../../common/http/outbound-http.module';
import { AppConfigModule } from '../../../config/app-config.module';
import { AppConfigService } from '../../../config/app-config.service';

import { OwidClient } from './owid-client.service';

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
  providers: [OwidClient],
  exports: [OwidClient],
})
export class OwidModule {}
