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
  @ApiOkResponse({
    description:
      'Data sources catalog returned successfully. Live providers list the upstream origins ' +
      '(producer, license and credit texts) of the data they republish.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        status: { type: 'number' },
        data: {
          type: 'object',
          properties: {
            providers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  origins: {
                    type: 'array',
                    description: 'Upstream producers, ordered by producer then title.',
                    items: {
                      type: 'object',
                      properties: {
                        producer: { type: 'string' },
                        title: { type: 'string' },
                        url: { type: 'string' },
                        license: {
                          type: 'object',
                          properties: { name: { type: 'string' }, url: { type: 'string' } },
                        },
                        notice: { type: 'string' },
                        citation: { type: 'string' },
                        disclaimer: { type: 'string' },
                        categories: { type: 'array', items: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
            datasets: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  })
  async getDataSources(): Promise<ApiResponse<DataSourcesCatalog>> {
    return { success: true, data: await this.service.getCatalog(), status: 200 };
  }
}
