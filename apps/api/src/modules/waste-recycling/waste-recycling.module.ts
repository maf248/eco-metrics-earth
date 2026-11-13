import { Module } from '@nestjs/common';

import { WasteRecyclingController } from './waste-recycling.controller';
import { WasteRecyclingService } from './waste-recycling.service';

@Module({
  controllers: [WasteRecyclingController],
  providers: [WasteRecyclingService],
})
export class WasteRecyclingModule {}
