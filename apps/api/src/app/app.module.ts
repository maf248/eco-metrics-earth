import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';

// MOCK CONTROLLER — remove when real eco modules are implemented in P2
import { DemoValidationController } from '../common/dto/demo-validation.controller';
import { AppConfigService } from '../config/app-config.service';
import { HealthModule } from '../health/health.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().port().default(3001),
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        CORS_ORIGIN: Joi.string().uri().default('http://localhost:3000'),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    HealthModule,
  ],
  controllers: [AppController, DemoValidationController],
  providers: [AppService, AppConfigService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
