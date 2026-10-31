import { Controller, Get } from '@nestjs/common';
import { ApiBadGatewayResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiResponse, Co2EmissionsData } from '@eco-metrics/shared';

import { buildOwidEnvelope } from '../providers/owid/owid-envelope';

import { Co2EmissionsService } from './co2-emissions.service';

@ApiTags('CO2 Emissions')
@Controller('co2-emissions')
export class Co2EmissionsController {
  constructor(private readonly service: Co2EmissionsService) {}

  @Get()
  @ApiOperation({
    summary: 'CO2 emissions of every country and the world',
    description:
      'Annual CO2 emissions (fossil fuels and industry) since 1950, total and per capita, ' +
      'for every country plus World, in one year-aligned payload. Takes no parameters.',
  })
  @ApiOkResponse({ description: 'Emissions for every country and World, with attribution' })
  @ApiBadGatewayResponse({
    description: 'The data provider is unavailable or returned invalid data',
  })
  async findAll(): Promise<ApiResponse<Co2EmissionsData>> {
    const { payload, fetchedAt, stale } = await this.service.getCo2Emissions();

    return buildOwidEnvelope(payload.data, payload.lastUpdated, { fetchedAt, stale });
  }
}
