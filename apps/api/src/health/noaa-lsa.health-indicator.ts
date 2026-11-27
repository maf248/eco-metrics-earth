import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HttpHealthIndicator } from '@nestjs/terminus';

import { USER_AGENT } from '../common/http/outbound-http-client.service';
import { AppConfigService } from '../config/app-config.service';
import { NOAA_LSA_FILE } from '../modules/providers/noaa-lsa/noaa-lsa.constants';

/** Milliseconds the provider has to answer the reachability probe. */
export const NOAA_LSA_HEALTH_TIMEOUT_MS = 3000;

/** Reachability of the NOAA Laboratory for Satellite Altimetry, with a `HEAD` request. */
@Injectable()
export class NoaaLsaHealthIndicator {
  constructor(
    private readonly http: HttpHealthIndicator,
    private readonly httpService: HttpService,
    private readonly appConfig: AppConfigService,
  ) {}

  check(): Promise<HealthIndicatorResult<'noaa-lsa'>> {
    return this.http.pingCheck('noaa-lsa', `${this.appConfig.noaaLsaBaseUrl}/${NOAA_LSA_FILE}`, {
      httpClient: this.httpService,
      method: 'HEAD',
      timeout: NOAA_LSA_HEALTH_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT },
    });
  }
}
