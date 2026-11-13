import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiResponse, WasteRecyclingData } from '@eco-metrics/shared';

import {
  WASTE_RECYCLING_LICENSE,
  WASTE_RECYCLING_PROVIDER,
  WASTE_RECYCLING_SOURCE_URL,
} from './waste-recycling.attribution';
import { WasteRecyclingService } from './waste-recycling.service';

@ApiTags('Waste & Recycling')
@Controller('waste-recycling')
export class WasteRecyclingController {
  constructor(private readonly service: WasteRecyclingService) {}

  @Get()
  @ApiOperation({
    summary: 'Municipal waste of every country and the world',
    description:
      'Municipal waste generated in 2022 and projected to 2050, what happens to it and what it ' +
      'is made of, for every country, from the World Bank What a Waste 3.0 dataset bundled with ' +
      'the API. Takes no parameters and calls no external service.',
  })
  @ApiOkResponse({ description: 'Waste data for every country and the world, with attribution' })
  findAll(): ApiResponse<WasteRecyclingData> {
    const { lastUpdated, retrieved } = this.service.getDates();

    return {
      success: true,
      data: this.service.getData(),
      status: 200,
      meta: {
        source: {
          provider: WASTE_RECYCLING_PROVIDER,
          license: WASTE_RECYCLING_LICENSE.name,
          sourceUrl: WASTE_RECYCLING_SOURCE_URL,
          lastUpdated,
        },
        // A static dataset has no fetch: it is as fresh as the day the workbook was retrieved.
        fetchedAt: `${retrieved}T00:00:00.000Z`,
      },
    };
  }
}
