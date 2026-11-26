import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HttpHealthIndicator } from '@nestjs/terminus';

import { USER_AGENT } from '../common/http/outbound-http-client.service';
import { AppConfigService } from '../config/app-config.service';
import { COPERNICUS_SST_FILE } from '../modules/providers/copernicus-climate-pulse/copernicus-climate-pulse.constants';

/** Milliseconds the provider has to answer the reachability probe. */
export const COPERNICUS_HEALTH_TIMEOUT_MS = 3000;

/**
 * Reachability of Copernicus Climate Pulse. A `HEAD` request: the file is about
 * 650 KB, which a probe must never download.
 */
@Injectable()
export class CopernicusClimatePulseHealthIndicator {
  constructor(
    private readonly http: HttpHealthIndicator,
    private readonly httpService: HttpService,
    private readonly appConfig: AppConfigService,
  ) {}

  check(): Promise<HealthIndicatorResult<'copernicus-climate-pulse'>> {
    return this.http.pingCheck(
      'copernicus-climate-pulse',
      `${this.appConfig.copernicusClimatePulseBaseUrl}/${COPERNICUS_SST_FILE}`,
      {
        httpClient: this.httpService,
        method: 'HEAD',
        timeout: COPERNICUS_HEALTH_TIMEOUT_MS,
        headers: { 'User-Agent': USER_AGENT },
      },
    );
  }
}
