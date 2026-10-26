import { Controller, Get } from '@nestjs/common';
import { ApiBadGatewayResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiResponse, GlobalTemperatureData } from '@eco-metrics/shared';

import { buildOwidEnvelope } from '../providers/owid/owid-envelope';

import { GlobalTemperatureService } from './global-temperature.service';

@ApiTags('Global Temperature')
@Controller('global-temperature')
export class GlobalTemperatureController {
  constructor(private readonly service: GlobalTemperatureService) {}

  @Get()
  @ApiOperation({
    summary: 'Temperature anomaly of every country and the world',
    description:
      'Annual surface temperature anomaly (degrees Celsius relative to the 1991-2020 average) ' +
      'since 1940 for every country plus World, in one year-aligned payload. Country values ' +
      'cover land only; World covers land and ocean. Takes no parameters.',
  })
  @ApiOkResponse({
    description: 'Anomalies for every country and World, with attribution and the upstream credit',
  })
  @ApiBadGatewayResponse({
    description: 'The data provider is unavailable or returned invalid data',
  })
  async findAll(): Promise<ApiResponse<GlobalTemperatureData>> {
    const { data, lastUpdated } = await this.service.getGlobalTemperature();

    return buildOwidEnvelope(data, lastUpdated);
  }
}
