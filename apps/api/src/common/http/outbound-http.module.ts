import { Module } from '@nestjs/common';

import { AppConfigModule } from '../../config/app-config.module';

import { OutboundHttpClient, OUTBOUND_FETCH } from './outbound-http-client.service';

@Module({
  imports: [AppConfigModule],
  providers: [
    {
      provide: OUTBOUND_FETCH,
      useValue: fetch,
    },
    OutboundHttpClient,
  ],
  exports: [OutboundHttpClient],
})
export class OutboundHttpModule {}
