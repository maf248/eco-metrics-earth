import { Controller, Get } from '@nestjs/common';
import { ApiBadGatewayResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type {
  ApiResponse,
  OceanHeatContentData,
  OceanPhData,
  OceanSeaLevelData,
  OceanSstAnomalyData,
  OceanSstDailyData,
} from '@eco-metrics/shared';

import { buildProviderEnvelope } from '../../common/envelope/provider-envelope';
import {
  COPERNICUS_CLIMATE_PULSE_PUBLISHER,
  NOAA_LSA_PUBLISHER,
} from '../../common/publishers/publishers';
import { buildOwidEnvelope } from '../providers/owid/owid-envelope';

import { OceanHeatContentService } from './ocean-heat-content.service';
import { OceanPhService } from './ocean-ph.service';
import { OceanSeaLevelService } from './ocean-sea-level.service';
import { OceanSstAnomalyService } from './ocean-sst-anomaly.service';
import { OceanSstDailyService } from './ocean-sst-daily.service';

const BAD_GATEWAY = 'The data provider is unavailable or returned invalid data';

/**
 * One endpoint per section: each has its own provider, `meta.source`, snapshot
 * and `502`, so one provider failing never takes the others down. None takes
 * parameters.
 */
@ApiTags('Ocean Health')
@Controller('ocean-health')
export class OceanHealthController {
  constructor(
    private readonly seaSurfaceTemperature: OceanSstDailyService,
    private readonly seaSurfaceAnomaly: OceanSstAnomalyService,
    private readonly heatContent: OceanHeatContentService,
    private readonly seaLevel: OceanSeaLevelService,
    private readonly ph: OceanPhService,
  ) {}

  @Get('sea-surface-temperature')
  @ApiOperation({
    summary: 'Daily sea surface temperature',
    description:
      'Daily mean sea surface temperature (degrees Celsius, ocean only, 60°S-60°N) since 1979, ' +
      'aligned by calendar day, with the 1991-2020 climatology, the latest day, the record day ' +
      'and the last 90 days. Takes no parameters.',
  })
  @ApiOkResponse({ description: 'The daily series with attribution and the upstream credit' })
  @ApiBadGatewayResponse({ description: BAD_GATEWAY })
  async findSeaSurfaceTemperature(): Promise<ApiResponse<OceanSstDailyData>> {
    const { payload, fetchedAt, stale } =
      await this.seaSurfaceTemperature.getSeaSurfaceTemperature();

    return buildProviderEnvelope(
      COPERNICUS_CLIMATE_PULSE_PUBLISHER,
      payload.data,
      payload.lastUpdated,
      { fetchedAt, stale },
    );
  }

  @Get('sea-surface-anomaly')
  @ApiOperation({
    summary: 'Annual sea surface temperature anomaly',
    description:
      'Annual sea surface temperature anomaly (degrees Celsius relative to the 1861-1890 ' +
      'average) for World and both hemispheres, with the 95% uncertainty bounds. Takes no ' +
      'parameters.',
  })
  @ApiOkResponse({ description: 'The annual anomaly with attribution and the upstream credit' })
  @ApiBadGatewayResponse({ description: BAD_GATEWAY })
  async findSeaSurfaceAnomaly(): Promise<ApiResponse<OceanSstAnomalyData>> {
    const { payload, fetchedAt, stale } = await this.seaSurfaceAnomaly.getSeaSurfaceAnomaly();

    return buildOwidEnvelope(payload.data, payload.lastUpdated, { fetchedAt, stale });
  }

  @Get('ocean-heat-content')
  @ApiOperation({
    summary: 'Ocean heat content',
    description:
      'World ocean heat content (10²² J) down to 700 m and 2000 m, one series per source. Each ' +
      'source uses its own reference period. Takes no parameters.',
  })
  @ApiOkResponse({ description: 'Both depths with attribution and the upstream credit' })
  @ApiBadGatewayResponse({ description: BAD_GATEWAY })
  async findOceanHeatContent(): Promise<ApiResponse<OceanHeatContentData>> {
    const { payload, fetchedAt, stale } = await this.heatContent.getHeatContent();

    return buildOwidEnvelope(payload.data, payload.lastUpdated, { fetchedAt, stale });
  }

  @Get('sea-level')
  @ApiOperation({
    summary: 'Global mean sea level',
    description:
      'Global mean sea level (millimetres) from satellite altimetry, one series per mission, ' +
      'with the long-term trend and the data start and end dates. Takes no parameters.',
  })
  @ApiOkResponse({ description: 'The mission series with attribution and the acknowledgment' })
  @ApiBadGatewayResponse({ description: BAD_GATEWAY })
  async findSeaLevel(): Promise<ApiResponse<OceanSeaLevelData>> {
    const { payload, fetchedAt, stale } = await this.seaLevel.getSeaLevel();

    return buildProviderEnvelope(NOAA_LSA_PUBLISHER, payload.data, payload.lastUpdated, {
      fetchedAt,
      stale,
    });
  }

  @Get('ocean-ph')
  @ApiOperation({
    summary: 'Ocean pH at Hawaii',
    description:
      'Monthly ocean pH at the Hawaii Ocean Time-series station with its rolling yearly ' +
      'average, aligned by date. Takes no parameters.',
  })
  @ApiOkResponse({ description: 'The pH series with attribution and the upstream credit' })
  @ApiBadGatewayResponse({ description: BAD_GATEWAY })
  async findOceanPh(): Promise<ApiResponse<OceanPhData>> {
    const { payload, fetchedAt, stale } = await this.ph.getPh();

    return buildOwidEnvelope(payload.data, payload.lastUpdated, { fetchedAt, stale });
  }
}
