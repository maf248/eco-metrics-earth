import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

import { OutboundHttpClient } from '../../../common/http/outbound-http-client.service';
import { AppConfigService } from '../../../config/app-config.service';

import { COPERNICUS_SST_FILE } from './copernicus-climate-pulse.constants';
import { type CopernicusSstSeries, parseCopernicusSstCsv } from './copernicus-climate-pulse.parser';

const CACHE_KEY = `copernicus-climate-pulse:${COPERNICUS_SST_FILE}`;

@Injectable()
export class CopernicusClimatePulseClient {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly httpClient: OutboundHttpClient,
    private readonly appConfig: AppConfigService,
  ) {}

  /**
   * The daily sea surface temperature series, parsed and validated. Cached for
   * `COPERNICUS_CLIMATE_PULSE_CACHE_TTL_SECONDS`; callers always get a copy.
   * Transport failures are `ProviderError`s and a changed layout is a
   * `ProviderDataError`.
   */
  async getDailySeaSurfaceTemperature(): Promise<CopernicusSstSeries> {
    const url = `${this.appConfig.copernicusClimatePulseBaseUrl}/${COPERNICUS_SST_FILE}`;

    const series = await this.cache.wrap<CopernicusSstSeries>(CACHE_KEY, async () =>
      parseCopernicusSstCsv(await this.httpClient.getText(url)),
    );

    return structuredClone(series);
  }
}
