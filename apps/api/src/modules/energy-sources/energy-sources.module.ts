import { Module } from '@nestjs/common';

import { OwidModule } from '../providers/owid/owid.module';

import { EnergySourcesController } from './energy-sources.controller';
import { EnergySourcesService } from './energy-sources.service';

@Module({
  imports: [OwidModule],
  controllers: [EnergySourcesController],
  providers: [EnergySourcesService],
})
export class EnergySourcesModule {}
