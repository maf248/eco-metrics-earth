import { Module } from '@nestjs/common';

import { SnapshotsModule } from '../../common/snapshots/snapshots.module';
import { CopernicusClimatePulseModule } from '../providers/copernicus-climate-pulse/copernicus-climate-pulse.module';
import { NoaaLsaModule } from '../providers/noaa-lsa/noaa-lsa.module';
import { OwidModule } from '../providers/owid/owid.module';

import { OceanHealthController } from './ocean-health.controller';
import { OceanHeatContentService } from './ocean-heat-content.service';
import { OceanPhService } from './ocean-ph.service';
import { OceanSeaLevelService } from './ocean-sea-level.service';
import { OceanSstAnomalyService } from './ocean-sst-anomaly.service';
import { OceanSstDailyService } from './ocean-sst-daily.service';

@Module({
  imports: [OwidModule, CopernicusClimatePulseModule, NoaaLsaModule, SnapshotsModule],
  controllers: [OceanHealthController],
  providers: [
    OceanSstDailyService,
    OceanSstAnomalyService,
    OceanHeatContentService,
    OceanSeaLevelService,
    OceanPhService,
  ],
})
export class OceanHealthModule {}
