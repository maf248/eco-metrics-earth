import { Controller, Get } from '@nestjs/common';
import { ApiBadGatewayResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { ApiResponse, ForestAreaData, TreeCoverLossData } from '@eco-metrics/shared';

import { buildOwidEnvelope } from '../providers/owid/owid-envelope';

import { ForestAreaService } from './forest-area.service';
import { TreeCoverLossService } from './tree-cover-loss.service';

const BAD_GATEWAY = 'The data provider is unavailable or returned invalid data';

/**
 * One endpoint per section: each has its own snapshot, `meta.source`, freshness and `502`, so
 * one failing never changes the other's response. Neither takes parameters.
 */
@ApiTags('Deforestation')
@Controller('deforestation')
export class DeforestationController {
  constructor(
    private readonly forestArea: ForestAreaService,
    private readonly treeCoverLoss: TreeCoverLossService,
  ) {}

  @Get('forest-area')
  @ApiOperation({
    summary: 'Forest area of every country and the world',
    description:
      'Forest area in hectares and as a percentage of land area, from 1990, for every country ' +
      'plus World, in one year-aligned payload (FAO Global Forest Resources Assessment 2025, ' +
      'republished by Our World in Data). A net measure that includes plantations; the years ' +
      'between FAO reference years are interpolated. A missing value is null, never zero. ' +
      'Takes no parameters.',
  })
  @ApiOkResponse({
    description: 'Forest area for every country and World, with attribution and credit',
  })
  @ApiBadGatewayResponse({ description: BAD_GATEWAY })
  async findForestArea(): Promise<ApiResponse<ForestAreaData>> {
    const { payload, fetchedAt, stale } = await this.forestArea.getForestArea();

    return buildOwidEnvelope(payload.data, payload.lastUpdated, { fetchedAt, stale });
  }

  @Get('tree-cover-loss')
  @ApiOperation({
    summary: 'Tree cover loss by dominant driver of every country and the world',
    description:
      'Hectares of tree cover lost per year since 2001, split into the seven dominant drivers ' +
      'published by Global Forest Watch (WRI and Google DeepMind, republished by Our World in ' +
      'Data), for every country plus World. It is satellite-detected loss of tree cover, not ' +
      'deforestation: it includes fire, logging and natural disturbance, much of which regrows. ' +
      'A driver with no value is null, never zero. Takes no parameters.',
  })
  @ApiOkResponse({
    description: 'Tree cover loss by driver for every country and World, with attribution',
  })
  @ApiBadGatewayResponse({ description: BAD_GATEWAY })
  async findTreeCoverLoss(): Promise<ApiResponse<TreeCoverLossData>> {
    const { payload, fetchedAt, stale } = await this.treeCoverLoss.getTreeCoverLoss();

    return buildOwidEnvelope(payload.data, payload.lastUpdated, { fetchedAt, stale });
  }
}
