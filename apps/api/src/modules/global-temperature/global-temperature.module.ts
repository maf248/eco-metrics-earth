import { Module } from '@nestjs/common';

import { OwidModule } from '../providers/owid/owid.module';

import { GlobalTemperatureController } from './global-temperature.controller';
import { GlobalTemperatureService } from './global-temperature.service';

@Module({
  imports: [OwidModule],
  controllers: [GlobalTemperatureController],
  providers: [GlobalTemperatureService],
})
export class GlobalTemperatureModule {}
