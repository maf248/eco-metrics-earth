import { Injectable } from '@nestjs/common';

import type { OceanSeaLevelData, OceanSeaLevelMission } from '@eco-metrics/shared';

import { ProviderDataError } from '../../common/errors/provider-error';
import { roundTo } from '../../common/series/build-year-aligned-entities';
import {
  ProviderSnapshotService,
  type Snapshotted,
} from '../../common/snapshots/provider-snapshot.service';
import { NoaaLsaClient, type NoaaLsaFile } from '../providers/noaa-lsa/noaa-lsa-client.service';
import { NoaaLsaStatus } from '../providers/noaa-lsa/noaa-lsa-status';
import { NOAA_LSA_ORIGIN } from '../providers/noaa-lsa/noaa-lsa.constants';

import {
  OCEAN_HEALTH_CATEGORY,
  OCEAN_HEALTH_SNAPSHOT_KEYS,
  OCEAN_SEA_LEVEL_DECIMALS,
  OCEAN_SEA_LEVEL_UNIT,
} from './ocean-health.constants';

export interface OceanSeaLevelResult {
  data: OceanSeaLevelData;
  /** Time of the download: the feed has no timestamp of its own. */
  lastUpdated: string;
}

/**
 * Converts a decimal year (`2025.1268`) to an ISO UTC calendar date: the start
 * of the year plus that fraction of the year's milliseconds, which respects
 * leap years, truncated to the day.
 */
export function decimalYearToIsoDate(decimalYear: number): string {
  const year = Math.floor(decimalYear);
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);

  return new Date(Math.round(start + (decimalYear - year) * (end - start)))
    .toISOString()
    .slice(0, 10);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * The yearly mean of every mission on one shared year range: the mean of the
 * mission's observations in each calendar year, rounded, `null` for a year it
 * did not observe.
 */
function annualMeans(missions: OceanSeaLevelMission[]): OceanSeaLevelData['annual'] {
  const yearOf = (date: string): number => Number(date.slice(0, 4));
  const startYear = Math.min(...missions.map(({ dates }) => yearOf(dates[0])));
  const endYear = Math.max(...missions.map(({ dates }) => yearOf(dates[dates.length - 1])));
  const length = endYear - startYear + 1;

  return {
    startYear,
    endYear,
    missions: missions.map(({ id, name, dates, values }) => {
      const sums = new Array<number>(length).fill(0);
      const counts = new Array<number>(length).fill(0);
      dates.forEach((date, index) => {
        const slot = yearOf(date) - startYear;
        sums[slot] += values[index];
        counts[slot] += 1;
      });
      return {
        id,
        name,
        values: sums.map((sum, slot) =>
          counts[slot] === 0 ? null : roundTo(sum / counts[slot], OCEAN_SEA_LEVEL_DECIMALS),
        ),
      };
    }),
  };
}

/**
 * Pure assembly of the sea level payload: one entry per mission that has at
 * least one value (each with only its own dates), their yearly means for the
 * table, the trend of the file header and the data's own start and end dates. Throws `ProviderDataError` when no
 * mission has a value.
 */
export function buildOceanSeaLevelData(file: NoaaLsaFile): OceanSeaLevelResult {
  const missions: OceanSeaLevelMission[] = [];

  file.missions.forEach((name, column) => {
    const dates: string[] = [];
    const values: number[] = [];
    for (const row of file.rows) {
      const value = row.values[column];
      if (value !== null) {
        dates.push(decimalYearToIsoDate(row.year));
        values.push(value);
      }
    }
    if (dates.length > 0) {
      missions.push({ id: slugify(name), name, dates, values });
    }
  });

  if (missions.length === 0) {
    throw new ProviderDataError('Ocean sea level response has no value in any mission');
  }

  // ISO dates sort as text; every mission's dates ascend, so only the ends matter.
  const startDate = missions.map(({ dates }) => dates[0]).sort()[0];
  const endDate = missions.map(({ dates }) => dates[dates.length - 1]).sort()[missions.length - 1];

  return {
    data: {
      unit: OCEAN_SEA_LEVEL_UNIT,
      startDate,
      endDate,
      trend: { ...file.trend },
      missions,
      annual: annualMeans(missions),
      origin: NOAA_LSA_ORIGIN,
    },
    lastUpdated: file.retrievedAt,
  };
}

@Injectable()
export class OceanSeaLevelService {
  constructor(
    private readonly noaa: NoaaLsaClient,
    private readonly providerStatus: NoaaLsaStatus,
    private readonly snapshots: ProviderSnapshotService,
  ) {
    this.providerStatus.registerCategory(OCEAN_HEALTH_CATEGORY);
  }

  /** Global mean sea level per mission, resolved through its own snapshot. */
  getSeaLevel(): Promise<Snapshotted<OceanSeaLevelResult>> {
    return this.snapshots.resolve(OCEAN_HEALTH_SNAPSHOT_KEYS.seaLevel, () => this.assemble());
  }

  private async assemble(): Promise<OceanSeaLevelResult> {
    const result = buildOceanSeaLevelData(await this.noaa.getSeaLevelSeries());
    this.providerStatus.recordRetrieval(result.lastUpdated);

    return result;
  }
}
