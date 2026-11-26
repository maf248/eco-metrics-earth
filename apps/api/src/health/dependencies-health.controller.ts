import { Controller, Get, HttpStatus, Res, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import type { Response } from 'express';

import { CopernicusClimatePulseHealthIndicator } from './copernicus-climate-pulse.health-indicator';
import { NoaaLsaHealthIndicator } from './noaa-lsa.health-indicator';
import { OwidHealthIndicator } from './owid.health-indicator';

/**
 * Reachability of external providers. Separate from the liveness probe
 * (`HealthController`), which must never call a provider: Cloud Run uses
 * liveness to start instances.
 */
@ApiTags('Health')
@Controller('health')
export class DependenciesHealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly owid: OwidHealthIndicator,
    private readonly copernicusClimatePulse: CopernicusClimatePulseHealthIndicator,
    private readonly noaaLsa: NoaaLsaHealthIndicator,
  ) {}

  @Get('dependencies')
  @ApiOperation({
    summary: 'Dependencies health check',
    description:
      'Checks that external data providers are reachable. Returns the Terminus result ' +
      '(not the ApiResponse envelope): 200 when every provider is up, 503 otherwise.',
  })
  @ApiResponse({
    status: 200,
    description: 'Every provider is reachable',
    schema: {
      example: {
        status: 'ok',
        info: {
          owid: { status: 'up' },
          'copernicus-climate-pulse': { status: 'up' },
          'noaa-lsa': { status: 'up' },
        },
        error: {},
        details: {
          owid: { status: 'up' },
          'copernicus-climate-pulse': { status: 'up' },
          'noaa-lsa': { status: 'up' },
        },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'At least one provider is unreachable' })
  async check(@Res({ passthrough: true }) response: Response): Promise<HealthCheckResult> {
    try {
      return await this.health.check([
        () => this.owid.check(),
        () => this.copernicusClimatePulse.check(),
        () => this.noaaLsa.check(),
      ]);
    } catch (error) {
      // Terminus signals failure with a ServiceUnavailableException whose response is the
      // result object. Return it as the body so the global filter does not flatten it.
      if (error instanceof ServiceUnavailableException) {
        response.status(HttpStatus.SERVICE_UNAVAILABLE);
        return error.getResponse() as HealthCheckResult;
      }
      throw error;
    }
  }
}
