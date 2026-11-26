import type { MetricSeries } from '@eco-metrics/shared';

import { isIsoCalendarDate } from '../../../common/parsing/csv-cells';

import {
  OwidInvalidParameterError,
  OwidParseError,
  OwidUnsupportedChartError,
} from './owid-errors';
import type { OwidDatedSeries } from './owid.types';

const EXPECTED_HEADER_PREFIX = ['entity', 'code', 'year'];

/** One CSV row of an entity: its year plus the raw cells of every value column. */
export interface GrapherTableRow {
  year: number;
  cells: string[];
}

export interface GrapherTableEntity {
  entityName: string;
  entityCode: string;
  /** Sorted ascending by year. */
  rows: GrapherTableRow[];
}

/**
 * A parsed Grapher CSV that keeps every value column, so a single download can
 * serve any column selection. Value cells stay raw until a column is selected.
 */
export interface GrapherTable {
  valueColumns: string[];
  /** Sorted by entity code for deterministic output. */
  entities: GrapherTableEntity[];
}

interface CsvParser {
  parseNextRow: () => string[] | null;
}

function createCsvParser(csv: string): CsvParser {
  let index = 0;
  let inQuotes = false;

  function parseNextRow(): string[] | null {
    if (index >= csv.length) {
      return null;
    }

    const row: string[] = [];
    let field = '';

    while (index < csv.length) {
      const char = csv[index];

      if (inQuotes) {
        if (char === '"') {
          if (csv[index + 1] === '"') {
            field += '"';
            index += 2;
          } else {
            inQuotes = false;
            index += 1;
          }
        } else {
          field += char;
          index += 1;
        }
      } else if (char === '"') {
        inQuotes = true;
        index += 1;
      } else if (char === ',') {
        row.push(field);
        field = '';
        index += 1;
      } else if (char === '\r' || char === '\n') {
        row.push(field);
        index += char === '\r' && csv[index + 1] === '\n' ? 2 : 1;
        return row;
      } else {
        field += char;
        index += 1;
      }
    }

    if (inQuotes) {
      throw new OwidParseError('Malformed CSV: unterminated quoted field.');
    }

    row.push(field);
    return row;
  }

  return { parseNextRow };
}

function parseNumericValue(raw: string): number | null {
  if (raw === '') {
    return null;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new OwidParseError(`Malformed CSV: value "${raw}" is not a finite number.`);
  }

  return value;
}

function formatColumns(valueColumns: string[]): string {
  return valueColumns.map((c) => `"${c}"`).join(', ');
}

function resolveValueColumnIndex(valueColumns: string[], column: string | undefined): number {
  if (column) {
    const columnIndex = valueColumns.indexOf(column);
    if (columnIndex === -1) {
      throw new OwidInvalidParameterError(
        `Unknown column "${column}". Available value columns: ${formatColumns(valueColumns)}.`,
      );
    }
    return columnIndex;
  }

  if (valueColumns.length === 1) {
    return 0;
  }

  throw new OwidUnsupportedChartError(
    `Chart has ${valueColumns.length} value columns; an explicit "column" selection is required. Available columns: ${formatColumns(valueColumns)}.`,
  );
}

function validateHeader(header: string[]): void {
  if (header.length < EXPECTED_HEADER_PREFIX.length + 1) {
    throw new OwidParseError(
      `Malformed CSV: expected header to start with "entity,code,year" followed by at least one value column, got "${header.join(',')}".`,
    );
  }

  for (let i = 0; i < EXPECTED_HEADER_PREFIX.length; i++) {
    if (header[i] !== EXPECTED_HEADER_PREFIX[i]) {
      throw new OwidParseError(
        `Malformed CSV: expected header to start with "entity,code,year", got "${header.join(',')}".`,
      );
    }
  }
}

export function parseGrapherTable(csv: string): GrapherTable {
  const parser = createCsvParser(csv);

  const header = parser.parseNextRow();
  if (header === null) {
    throw new OwidParseError('Malformed CSV: no header row found.');
  }

  validateHeader(header);

  const valueColumns = header.slice(EXPECTED_HEADER_PREFIX.length);
  const entitiesByCode = new Map<string, GrapherTableEntity>();

  let rowIndex = 1;
  let row = parser.parseNextRow();

  while (row !== null) {
    if (row.length !== header.length) {
      throw new OwidParseError(
        `Malformed CSV: row ${rowIndex + 1} has ${row.length} columns, expected ${header.length}.`,
      );
    }

    const [entityName, entityCode, yearRaw] = row;

    // Rows without a code (e.g. some region aggregates) cannot be addressed by entity code.
    if (entityCode !== '') {
      const year = Number(yearRaw);
      if (!Number.isInteger(year)) {
        throw new OwidParseError(
          `Malformed CSV: row ${rowIndex + 1} has non-integer year "${yearRaw}".`,
        );
      }

      let entity = entitiesByCode.get(entityCode);
      if (!entity) {
        entity = { entityName, entityCode, rows: [] };
        entitiesByCode.set(entityCode, entity);
      }

      entity.rows.push({ year, cells: row.slice(EXPECTED_HEADER_PREFIX.length) });
    }

    row = parser.parseNextRow();
    rowIndex += 1;
  }

  const entities = [...entitiesByCode.values()];
  for (const entity of entities) {
    entity.rows.sort((a, b) => a.year - b.year);
  }
  entities.sort((a, b) => a.entityCode.localeCompare(b.entityCode));

  return { valueColumns, entities };
}

/**
 * Maps one value column of a parsed table to `MetricSeries[]`. Always builds
 * new objects, so the result never shares references with the input table.
 */
export function selectGrapherColumn(table: GrapherTable, column?: string): MetricSeries[] {
  const valueColumnIndex = resolveValueColumnIndex(table.valueColumns, column);

  return table.entities.map((entity) => ({
    entityName: entity.entityName,
    entityCode: entity.entityCode,
    points: entity.rows.map((row) => ({
      year: row.year,
      value: parseNumericValue(row.cells[valueColumnIndex]),
    })),
  }));
}

export function parseGrapherCsv(csv: string, column?: string): MetricSeries[] {
  return selectGrapherColumn(parseGrapherTable(csv), column);
}

const DATED_HEADER_PREFIX = ['entity', 'day'];

/** A parsed date-indexed Grapher CSV: every value column, numerically validated. */
export interface GrapherDatedTable {
  entityName: string;
  valueColumns: string[];
  /** Sorted ascending by date. */
  rows: { date: string; cells: (number | null)[] }[];
}

/**
 * Parses a date-indexed Grapher CSV (`entity,day,<value columns...>`, no `code`
 * column). Separate from {@link parseGrapherTable}, whose strict header check is
 * what makes a map-tab response fail loudly. Expects one entity and ISO dates.
 */
export function parseGrapherDatedTable(csv: string): GrapherDatedTable {
  const parser = createCsvParser(csv);

  const header = parser.parseNextRow();
  if (header === null) {
    throw new OwidParseError('Malformed CSV: no header row found.');
  }
  if (
    header.length < DATED_HEADER_PREFIX.length + 1 ||
    DATED_HEADER_PREFIX.some((name, i) => header[i] !== name)
  ) {
    throw new OwidParseError(
      `Malformed CSV: expected header to start with "entity,day" followed by at least one value column, got "${header.join(',')}".`,
    );
  }

  const valueColumns = header.slice(DATED_HEADER_PREFIX.length);
  const rows: GrapherDatedTable['rows'] = [];
  let entityName: string | undefined;

  let rowIndex = 1;
  let row = parser.parseNextRow();
  while (row !== null) {
    // A trailing newline yields no extra row; a lone blank line is tolerated only at the end.
    if (!(row.length === 1 && row[0] === '')) {
      if (row.length !== header.length) {
        throw new OwidParseError(
          `Malformed CSV: row ${rowIndex + 1} has ${row.length} columns, expected ${header.length}.`,
        );
      }
      const [name, date] = row;
      if (!isIsoCalendarDate(date)) {
        throw new OwidParseError(
          `Malformed CSV: row ${rowIndex + 1} has a non-ISO date "${date}".`,
        );
      }
      if (entityName !== undefined && name !== entityName) {
        throw new OwidParseError(
          `Malformed CSV: expected a single entity, found "${entityName}" and "${name}".`,
        );
      }
      entityName = name;
      rows.push({
        date,
        cells: row.slice(DATED_HEADER_PREFIX.length).map((cell) => parseNumericValue(cell)),
      });
    }
    row = parser.parseNextRow();
    rowIndex += 1;
  }

  if (entityName === undefined) {
    throw new OwidParseError('Malformed CSV: no data rows found.');
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));

  return { entityName, valueColumns, rows };
}

/**
 * Picks `columns` of a parsed dated table. Always builds new objects, so the
 * result never shares references with the (cached) table.
 */
export function selectDatedColumns(table: GrapherDatedTable, columns: string[]): OwidDatedSeries {
  const indexes = columns.map((column) => {
    const index = table.valueColumns.indexOf(column);
    if (index === -1) {
      throw new OwidParseError(
        `Missing column "${column}". Available value columns: ${formatColumns(table.valueColumns)}.`,
      );
    }
    return index;
  });

  return {
    entityName: table.entityName,
    columns: [...columns],
    rows: table.rows.map(({ date, cells }) => ({
      date,
      values: indexes.map((index) => cells[index]),
    })),
  };
}
