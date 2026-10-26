import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HttpHealthIndicator } from '@nestjs/terminus';

import { USER_AGENT } from '../common/http/outbound-http-client.service';
import { AppConfigService } from '../config/app-config.service';

/** Milliseconds the provider has to answer the reachability probe. */
export const OWID_HEALTH_TIMEOUT_MS = 3000;

/** Light chart metadata (about 4 KB) of the chart the CO2 module depends on. */
export const OWID_HEALTH_PROBE_PATH = '/co-emissions-per-capita.metadata.json';

/**
 * Reachability of Our World in Data. One indicator per provider (not per
 * category): every OWID-backed module relies on this single check.
 */
@Injectable()
export class OwidHealthIndicator {
  constructor(
    private readonly http: HttpHealthIndicator,
    private readonly httpService: HttpService,
    private readonly appConfig: AppConfigService,
  ) {}

  check(): Promise<HealthIndicatorResult<'owid'>> {
    return this.http.pingCheck(
      'owid',
      `${this.appConfig.owidGrapherBaseUrl}${OWID_HEALTH_PROBE_PATH}`,
      {
        httpClient: this.httpService,
        timeout: OWID_HEALTH_TIMEOUT_MS,
        headers: { 'User-Agent': USER_AGENT },
      },
    );
  }
}
