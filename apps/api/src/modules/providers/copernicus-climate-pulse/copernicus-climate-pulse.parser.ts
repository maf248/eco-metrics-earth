import { ProviderDataError } from '../../../common/errors/provider-error';
import { isIsoCalendarDate, parseFiniteNumber } from '../../../common/parsing/csv-cells';

import {
  COPERNICUS_SST_HEADER,
  COPERNICUS_SST_UNIT_LINE,
} from './copernicus-climate-pulse.constants';

/** One day of the Climate Pulse file. `status` is the file's own text (`FINAL`, `PRELIMINARY`). */
export interface CopernicusSstRow {
  /** ISO 8601 calendar date. */
  date: string;
  /** Daily mean sea surface temperature, degrees Celsius. */
  sst: number;
  /** 1991-2020 daily climatology, degrees Celsius. */
  climatology: number;
  /** `sst` minus `climatology`, degrees Celsius. */
  anomaly: number;
  status: string;
}

export interface CopernicusSstSeries {
  /** In file order (ascending by date). */
  rows: CopernicusSstRow[];
  /** ISO 8601 time the provider says the file was updated (or the latest row's date). */
  lastUpdated: string;
}

const UNITS_PATTERN = /^#\s*Units:\s*(.*?)\s*$/i;
const LAST_UPDATED_PATTERN = /^#\s*Last updated:\s*(\d{1,2}) ([A-Za-z]{3}) (\d{4})\s*$/i;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function parseLastUpdated(line: string): string | undefined {
  const match = LAST_UPDATED_PATTERN.exec(line);
  if (!match) {
    return undefined;
  }
  const month = MONTHS.indexOf(match[2].toLowerCase());
  if (month === -1) {
    return undefined;
  }
  const date = new Date(Date.UTC(Number(match[3]), month, Number(match[1])));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * Parses the Climate Pulse daily CSV: `#` comment lines (units and timestamp),
 * the exact header, then one row per day. A changed header, unit or row throws
 * `ProviderDataError`, so a changed file never becomes a mislabelled chart.
 */
export function parseCopernicusSstCsv(csv: string): CopernicusSstSeries {
  const lines = csv.split(/\r?\n/);

  let unit: string | undefined;
  let lastUpdated: string | undefined;
  let headerIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#')) {
      unit ??= UNITS_PATTERN.exec(line)?.[1];
      lastUpdated ??= parseLastUpdated(line);
    } else if (line.trim() !== '') {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new ProviderDataError('Copernicus Climate Pulse file has no header row');
  }
  if (unit !== COPERNICUS_SST_UNIT_LINE) {
    throw new ProviderDataError(
      `Copernicus Climate Pulse unit is "${unit ?? 'missing'}", expected "${COPERNICUS_SST_UNIT_LINE}"`,
    );
  }
  if (lines[headerIndex].trim() !== COPERNICUS_SST_HEADER) {
    throw new ProviderDataError(
      `Copernicus Climate Pulse header is "${lines[headerIndex].trim()}", expected "${COPERNICUS_SST_HEADER}"`,
    );
  }

  const rows: CopernicusSstRow[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      continue;
    }
    const where = `Copernicus Climate Pulse line ${i + 1}`;
    const cells = line.split(',');
    if (cells.length !== 5) {
      throw new ProviderDataError(`${where}: expected 5 columns, got ${cells.length}`);
    }
    const [date, sst, climatology, anomaly, status] = cells;
    if (!isIsoCalendarDate(date)) {
      throw new ProviderDataError(`${where}: date "${date}" is not an ISO date`);
    }
    if (status === '') {
      throw new ProviderDataError(`${where}: empty status`);
    }
    rows.push({
      date,
      sst: parseFiniteNumber(sst, `${where}: sst`),
      climatology: parseFiniteNumber(climatology, `${where}: clim_91-20`),
      anomaly: parseFiniteNumber(anomaly, `${where}: ano_91-20`),
      status,
    });
  }

  if (rows.length === 0) {
    throw new ProviderDataError('Copernicus Climate Pulse file has no data rows');
  }

  return {
    rows,
    lastUpdated: lastUpdated ?? `${rows[rows.length - 1].date}T00:00:00.000Z`,
  };
}
