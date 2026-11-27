import { Module } from '@nestjs/common';

import { SnapshotsModule } from '../../common/snapshots/snapshots.module';
import { OwidModule } from '../providers/owid/owid.module';

import { DeforestationController } from './deforestation.controller';
import { ForestAreaService } from './forest-area.service';
import { TreeCoverLossService } from './tree-cover-loss.service';

@Module({
  imports: [OwidModule, SnapshotsModule],
  controllers: [DeforestationController],
  providers: [ForestAreaService, TreeCoverLossService],
})
export class DeforestationModule {}
