import { Module } from '@nestjs/common';

import { SnapshotsModule } from '../../common/snapshots/snapshots.module';
import { OwidModule } from '../providers/owid/owid.module';

import { Co2EmissionsController } from './co2-emissions.controller';
import { Co2EmissionsService } from './co2-emissions.service';

@Module({
  imports: [OwidModule, SnapshotsModule],
  controllers: [Co2EmissionsController],
  providers: [Co2EmissionsService],
})
export class Co2EmissionsModule {}
