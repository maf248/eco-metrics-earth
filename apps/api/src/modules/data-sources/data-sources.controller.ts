import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiResponse, DataSourcesCatalog } from '@eco-metrics/shared';

import { DataSourcesService } from './data-sources.service';

@ApiTags('Data Sources')
@Controller('data-sources')
export class DataSourcesController {
  constructor(private readonly service: DataSourcesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get the data sources in use',
    description:
      'Returns every live data provider and static dataset declared by the API modules, with license and dates.',
  })
  @ApiOkResponse({ description: 'Data sources catalog returned successfully.' })
  async getDataSources(): Promise<ApiResponse<DataSourcesCatalog>> {
    return { success: true, data: await this.service.getCatalog(), status: 200 };
  }
}
