import { ProviderDataError } from '../../../common/errors/provider-error';
import { parseFiniteNumber } from '../../../common/parsing/csv-cells';

export interface NoaaLsaTrend {
  value: number;
  unit: string;
  note: string;
}

/** One observation date: a decimal year and one value (or `null`) per mission column. */
export interface NoaaLsaRow {
  year: number;
  values: (number | null)[];
}

export interface NoaaLsaSeries {
  trend: NoaaLsaTrend;
  /** Mission names in column order. */
  missions: string[];
  /** In file order. */
  rows: NoaaLsaRow[];
}

// `#trend = 3.11 mm/year (no glacial isostatic adjustment correction)`
const TREND_PATTERN = /^#\s*trend\s*=\s*(-?\d+(?:\.\d+)?)\s+(\S+)\s+\((.*)\)\s*$/i;

/**
 * Parses the NOAA LSA altimetry CSV: `#` header lines (the long-term trend is
 * required), a header starting with `year` followed by one column per mission,
 * then the observations with blank cells for missions that did not observe.
 * Anything unexpected throws `ProviderDataError`.
 */
export function parseNoaaLsaCsv(csv: string): NoaaLsaSeries {
  const lines = csv.split(/\r?\n/);

  let trend: NoaaLsaTrend | undefined;
  let headerIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#')) {
      const match = TREND_PATTERN.exec(line);
      if (match && trend === undefined) {
        trend = { value: Number(match[1]), unit: match[2], note: match[3].trim() };
      }
    } else if (line.trim() !== '') {
      headerIndex = i;
      break;
    }
  }

  if (trend === undefined) {
    throw new ProviderDataError(
      'NOAA LSA file has no valid "#trend = <value> <unit> (<note>)" line',
    );
  }
  if (headerIndex === -1) {
    throw new ProviderDataError('NOAA LSA file has no header row');
  }

  const header = lines[headerIndex].split(',').map((cell) => cell.trim());
  const missions = header.slice(1);
  if (header[0] !== 'year' || missions.length === 0 || missions.some((name) => name === '')) {
    throw new ProviderDataError(
      `NOAA LSA header "${lines[headerIndex].trim()}" must start with "year" and name at least one mission`,
    );
  }

  const rows: NoaaLsaRow[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      continue;
    }
    const lineNumber = i + 1;
    const cells = line.split(',');
    if (cells.length !== header.length) {
      throw new ProviderDataError(
        `NOAA LSA line ${lineNumber}: expected ${header.length} columns, got ${cells.length}`,
      );
    }
    rows.push({
      year: parseFiniteNumber(cells[0], `NOAA LSA line ${lineNumber}: year`),
      values: cells
        .slice(1)
        .map((cell, index) =>
          cell.trim() === ''
            ? null
            : parseFiniteNumber(cell, `NOAA LSA line ${lineNumber}: ${missions[index]}`),
        ),
    });
  }

  if (rows.length === 0) {
    throw new ProviderDataError('NOAA LSA file has no data rows');
  }

  return { trend, missions, rows };
}
