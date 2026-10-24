import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { DataSourcesController } from './data-sources.controller';
import { DataSourcesService } from './data-sources.service';

@Module({
  imports: [DiscoveryModule],
  controllers: [DataSourcesController],
  providers: [DataSourcesService],
})
export class DataSourcesModule {}
