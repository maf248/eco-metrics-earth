import { Controller, Get } from '@nestjs/common';
import { ApiBadGatewayResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiResponse, EnergySourcesData } from '@eco-metrics/shared';

import { buildOwidEnvelope } from '../providers/owid/owid-envelope';

import { EnergySourcesService } from './energy-sources.service';

@ApiTags('Energy Sources')
@Controller('energy-sources')
export class EnergySourcesController {
  constructor(private readonly service: EnergySourcesService) {}

  @Get()
  @ApiOperation({
    summary: 'Electricity generation by source of every country and the world',
    description:
      'Electricity generation (terawatt-hours) from coal, gas, oil, nuclear, hydro, wind, solar ' +
      'and bioenergy & other renewables, from 2000, for every country plus World, in one ' +
      'year-aligned payload. Electricity only, not primary energy. A source with no reported ' +
      'value is null, never zero. Shares are not served: they are derived from generation. ' +
      'Takes no parameters.',
  })
  @ApiOkResponse({
    description: 'Generation by source for every country and World, with attribution and credit',
  })
  @ApiBadGatewayResponse({
    description: 'The data provider is unavailable or returned invalid data',
  })
  async findAll(): Promise<ApiResponse<EnergySourcesData>> {
    const { data, lastUpdated } = await this.service.getEnergySources();

    return buildOwidEnvelope(data, lastUpdated);
  }
}
