import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { AppConfigModule } from '../config/app-config.module';

import { CopernicusClimatePulseHealthIndicator } from './copernicus-climate-pulse.health-indicator';
import { DependenciesHealthController } from './dependencies-health.controller';
import { HealthController } from './health.controller';
import { NoaaLsaHealthIndicator } from './noaa-lsa.health-indicator';
import { OwidHealthIndicator } from './owid.health-indicator';

@Module({
  imports: [TerminusModule, HttpModule, AppConfigModule],
  controllers: [HealthController, DependenciesHealthController],
  providers: [OwidHealthIndicator, CopernicusClimatePulseHealthIndicator, NoaaLsaHealthIndicator],
})
export class HealthModule {}
