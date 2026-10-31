import { Module } from '@nestjs/common';

import { SnapshotsModule } from '../../common/snapshots/snapshots.module';
import { OwidModule } from '../providers/owid/owid.module';

import { GlobalTemperatureController } from './global-temperature.controller';
import { GlobalTemperatureService } from './global-temperature.service';

@Module({
  imports: [OwidModule, SnapshotsModule],
  controllers: [GlobalTemperatureController],
  providers: [GlobalTemperatureService],
})
export class GlobalTemperatureModule {}
