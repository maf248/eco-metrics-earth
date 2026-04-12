import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from '../health/health.controller';
import { AppConfigService } from '../config/app-config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().port().default(3001),
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, AppConfigService],
})
export class AppModule {}
