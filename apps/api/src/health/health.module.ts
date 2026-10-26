import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { AppConfigModule } from '../config/app-config.module';

import { DependenciesHealthController } from './dependencies-health.controller';
import { HealthController } from './health.controller';
import { OwidHealthIndicator } from './owid.health-indicator';

@Module({
  imports: [TerminusModule, HttpModule, AppConfigModule],
  controllers: [HealthController, DependenciesHealthController],
  providers: [OwidHealthIndicator],
})
export class HealthModule {}
