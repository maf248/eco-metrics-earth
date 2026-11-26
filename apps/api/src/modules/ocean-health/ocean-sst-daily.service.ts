import { Injectable } from '@nestjs/common';

import type { OceanSstDailyData, OceanSstDailyPoint, OceanSstStatus } from '@eco-metrics/shared';

import { ProviderDataError } from '../../common/errors/provider-error';
import {
  ProviderSnapshotService,
  type Snapshotted,
} from '../../common/snapshots/provider-snapshot.service';
import { CopernicusClimatePulseClient } from '../providers/copernicus-climate-pulse/copernicus-climate-pulse-client.service';
import { CopernicusClimatePulseStatus } from '../providers/copernicus-climate-pulse/copernicus-climate-pulse-status';
import { COPERNICUS_CLIMATE_PULSE_ORIGIN } from '../providers/copernicus-climate-pulse/copernicus-climate-pulse.constants';
import type {
  CopernicusSstRow,
  CopernicusSstSeries,
} from '../providers/copernicus-climate-pulse/copernicus-climate-pulse.parser';

import {
  OCEAN_HEALTH_CATEGORY,
  OCEAN_HEALTH_SNAPSHOT_KEYS,
  OCEAN_SST_DAILY_BASELINE,
  OCEAN_SST_DAILY_COVERAGE,
  OCEAN_SST_DAILY_RECENT_DAYS,
  OCEAN_SST_DAILY_SLOTS,
  OCEAN_SST_DAILY_UNIT,
} from './ocean-health.constants';

export interface OceanSstDailyResult {
  data: OceanSstDailyData;
  /** The provider's own timestamp of the file. */
  lastUpdated: string;
}

const LABEL = 'Ocean sea surface temperature';

/** Cumulative days before each month in a leap year: slot of `month`-`day` is `offset + day - 1`. */
const LEAP_YEAR_MONTH_OFFSETS = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335] as const;

const STATUSES: ReadonlyMap<string, OceanSstStatus> = new Map([
  ['FINAL', 'final'],
  ['PRELIMINARY', 'preliminary'],
]);

/** Slot of an ISO date: 1 March is the same slot in every year, 29 February has its own. */
function slotOf(date: string): number {
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return LEAP_YEAR_MONTH_OFFSETS[month - 1] + day - 1;
}

function toPoint(row: CopernicusSstRow): OceanSstDailyPoint {
  const status = STATUSES.get(row.status.toUpperCase());
  if (status === undefined) {
    throw new ProviderDataError(`${LABEL} row ${row.date} has the unknown status "${row.status}"`);
  }
  return {
    date: row.date,
    sst: row.sst,
    climatology: row.climatology,
    anomaly: row.anomaly,
    status,
  };
}

/**
 * Pure reduction of the Climate Pulse rows to the calendar-day-aligned payload:
 * one 366-slot array per year, the climatology curve, the latest day, the day
 * with the highest absolute temperature (a tie names the most recent date) and
 * the last 90 days for the table. "Current year" is the year of the latest row,
 * never the clock. Throws `ProviderDataError` for no rows or an unknown status.
 */
export function buildOceanSstDailyData(series: CopernicusSstSeries): OceanSstDailyResult {
  if (series.rows.length === 0) {
    throw new ProviderDataError(`${LABEL} response has no data rows`);
  }

  const points = series.rows.map(toPoint).sort((a, b) => a.date.localeCompare(b.date));
  const startYear = Number(points[0].date.slice(0, 4));
  const latest = points[points.length - 1];
  const endYear = Number(latest.date.slice(0, 4));

  const years = Array.from({ length: endYear - startYear + 1 }, (_, index) => ({
    year: startYear + index,
    values: new Array<number | null>(OCEAN_SST_DAILY_SLOTS).fill(null),
  }));
  // The climatology is the same for a month-day in every year of the source.
  const climatology = new Array<number | null>(OCEAN_SST_DAILY_SLOTS).fill(null);

  let record = points[0];
  for (const point of points) {
    const slot = slotOf(point.date);
    years[Number(point.date.slice(0, 4)) - startYear].values[slot] = point.sst;
    climatology[slot] ??= point.climatology;
    // `>=` keeps the most recent date on a tie (points ascend by date).
    if (point.sst >= record.sst) {
      record = point;
    }
  }

  return {
    data: {
      unit: OCEAN_SST_DAILY_UNIT,
      coverage: OCEAN_SST_DAILY_COVERAGE,
      baseline: { ...OCEAN_SST_DAILY_BASELINE },
      startYear,
      endYear,
      years,
      climatology,
      latest,
      record,
      recent: points.slice(-OCEAN_SST_DAILY_RECENT_DAYS),
      origin: COPERNICUS_CLIMATE_PULSE_ORIGIN,
    },
    lastUpdated: series.lastUpdated,
  };
}

@Injectable()
export class OceanSstDailyService {
  constructor(
    private readonly copernicus: CopernicusClimatePulseClient,
    private readonly providerStatus: CopernicusClimatePulseStatus,
    private readonly snapshots: ProviderSnapshotService,
  ) {
    this.providerStatus.registerCategory(OCEAN_HEALTH_CATEGORY);
  }

  /**
   * Daily sea surface temperature. A provider failure serves the stored last
   * good payload (`stale: true`) when there is one; otherwise the error
   * propagates and becomes 502 in the global filter.
   */
  getSeaSurfaceTemperature(): Promise<Snapshotted<OceanSstDailyResult>> {
    return this.snapshots.resolve(OCEAN_HEALTH_SNAPSHOT_KEYS.seaSurfaceTemperature, () =>
      this.assemble(),
    );
  }

  private async assemble(): Promise<OceanSstDailyResult> {
    const result = buildOceanSstDailyData(await this.copernicus.getDailySeaSurfaceTemperature());
    this.providerStatus.recordProviderUpdate(result.lastUpdated);

    return result;
  }
}
