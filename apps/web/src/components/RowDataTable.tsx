import { DataTableDisclosure } from '@/components/DataTableDisclosure';
import { ScrollRegion } from '@/components/ScrollRegion';

export interface RowDataColumn<R> {
  header: string;
  /** Text of the cell; `null` (a value the source does not have) shows an em dash. */
  format: (row: R) => string | null;
}

interface RowDataTableProps<R> {
  caption: string;
  /** Names the scrollable region for assistive technology. */
  entityName: string;
  /** Header of the first column, whose cells are row headers (for example `Date`). */
  rowHeaderLabel: string;
  /** Text of a row's header cell. */
  rowHeader: (row: R) => string;
  /** Stable key of a row (a date, or a date and a mission). */
  rowKey: (row: R) => string;
  /** Rows in display order: the caller puts the newest first. */
  rows: readonly R[];
  columns: RowDataColumn<R>[];
  /** Said before the table, for example that only the most recent rows are listed. */
  note?: string;
}

const EMPTY_CELL = '—';
const MIN_WIDTH_CLASS_NAME = 'min-w-72';

/**
 * The text equivalent of a chart whose data is keyed by date rather than by year: one row per
 * observation, in the order given, collapsed by default. Like `YearDataTable` it is a
 * server-rendered disclosure with a keyboard-focusable scroll region.
 */
export function RowDataTable<R>({
  caption,
  entityName,
  rowHeaderLabel,
  rowHeader,
  rowKey,
  rows,
  columns,
  note,
}: Readonly<RowDataTableProps<R>>) {
  return (
    <DataTableDisclosure>
      {note ? <p className="mt-2 text-sm text-fg-muted">{note}</p> : null}
      <ScrollRegion label={`Data table for ${entityName}`} className="mt-2 max-h-96">
        {/* Borders on the cells: a collapsed border scrolls away from the sticky header. */}
        <table
          className={`w-full ${MIN_WIDTH_CLASS_NAME} border-separate border-spacing-0 text-sm tabular-nums`}
        >
          <caption className="px-3 py-2 text-left font-medium text-fg">{caption}</caption>
          <thead className="sticky top-0 bg-surface-card">
            <tr className="text-fg *:border-b *:border-line-strong">
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                {rowHeaderLabel}
              </th>
              {columns.map(({ header }) => (
                <th key={header} scope="col" className="px-3 py-2 text-right font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="*:border-b *:border-line-subtle last:*:border-b-0">
                <th scope="row" className="px-3 py-2 text-left font-medium text-fg">
                  {rowHeader(row)}
                </th>
                {columns.map(({ header, format }) => (
                  <td key={header} className="px-3 py-2 text-right text-fg-body">
                    {format(row) ?? EMPTY_CELL}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
    </DataTableDisclosure>
  );
}
