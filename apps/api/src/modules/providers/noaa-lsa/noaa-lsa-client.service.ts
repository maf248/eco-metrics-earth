import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

import { OutboundHttpClient } from '../../../common/http/outbound-http-client.service';
import { AppConfigService } from '../../../config/app-config.service';

import { NOAA_LSA_FILE } from './noaa-lsa.constants';
import { type NoaaLsaSeries, parseNoaaLsaCsv } from './noaa-lsa.parser';

/** The parsed file and when it was downloaded (the feed carries no timestamp). */
export interface NoaaLsaFile extends NoaaLsaSeries {
  /** ISO 8601 time of the download that filled the cache, stable until the entry expires. */
  retrievedAt: string;
}

const CACHE_KEY = `noaa-lsa:${NOAA_LSA_FILE}`;

@Injectable()
export class NoaaLsaClient {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly httpClient: OutboundHttpClient,
    private readonly appConfig: AppConfigService,
  ) {}

  /**
   * The global mean sea level series, parsed and validated. Cached for
   * `NOAA_LSA_CACHE_TTL_SECONDS`; callers always get a copy. `retrievedAt` is
   * the time of the download behind the cached entry, so it does not change
   * with every request (a changing timestamp would rewrite the snapshot each time).
   */
  async getSeaLevelSeries(): Promise<NoaaLsaFile> {
    const url = `${this.appConfig.noaaLsaBaseUrl}/${NOAA_LSA_FILE}`;

    const series = await this.cache.wrap<NoaaLsaFile>(CACHE_KEY, async () => ({
      ...parseNoaaLsaCsv(await this.httpClient.getText(url)),
      retrievedAt: new Date().toISOString(),
    }));

    return structuredClone(series);
  }
}
