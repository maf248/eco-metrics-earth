import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { AppConfigService } from '../../config/app-config.service';

import { buildLoggerParams } from './logger-options';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) =>
        buildLoggerParams({
          logLevel: appConfig.logLevel,
          nodeEnv: appConfig.nodeEnv,
          gcpProjectId: appConfig.gcpProjectId,
        }),
    }),
  ],
})
export class AppLoggingModule {}
