import { Module } from '@nestjs/common';

import { WaterFootprintController } from './water-footprint.controller';
import { WaterFootprintService } from './water-footprint.service';

@Module({
  controllers: [WaterFootprintController],
  providers: [WaterFootprintService],
})
export class WaterFootprintModule {}
