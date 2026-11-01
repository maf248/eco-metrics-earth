import { Module } from '@nestjs/common';

import { SnapshotsModule } from '../../common/snapshots/snapshots.module';
import { OwidModule } from '../providers/owid/owid.module';

import { EnergySourcesController } from './energy-sources.controller';
import { EnergySourcesService } from './energy-sources.service';

@Module({
  imports: [OwidModule, SnapshotsModule],
  controllers: [EnergySourcesController],
  providers: [EnergySourcesService],
})
export class EnergySourcesModule {}
