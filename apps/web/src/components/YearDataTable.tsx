export interface YearDataColumn {
  header: string;
  /** Year-aligned values: index `i` is the year `startYear + i`. */
  values: (number | null)[];
  /** Text of a present value; a `null` value always shows an em dash. */
  format: (value: number) => string;
}

interface YearDataTableProps {
  caption: string;
  /** Names the scrollable region for assistive technology. */
  entityName: string;
  startYear: number;
  endYear: number;
  columns: YearDataColumn[];
  /** Many columns: narrow two-line headers, and the region scrolls below the minimum width. */
  wide?: boolean;
}

const EMPTY_CELL = '—';
const DEFAULT_MIN_WIDTH_CLASS_NAME = 'min-w-72';
// Fits the desktop card, and keeps the wide headers on two lines when the region scrolls.
const WIDE_MIN_WIDTH_CLASS_NAME = 'min-w-3xl';

/**
 * The text equivalent of a chart: every year of the selected entity, newest
 * first, collapsed by default. Server-rendered for the default selection.
 */
export function YearDataTable({
  caption,
  entityName,
  startYear,
  endYear,
  columns,
  wide = false,
}: YearDataTableProps) {
  const years = Array.from({ length: endYear - startYear + 1 }, (_, index) => endYear - index);

  return (
    <details className="group mt-4 border-t border-line-subtle pt-2">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-1 font-medium text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset [&::-webkit-details-marker]:hidden">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 4l6 6-6 6" />
        </svg>
        View data table
      </summary>

      <div
        role="region"
        aria-label={`Data table for ${entityName}, scrollable`}
        // Focusable so the scroll region can be scrolled by keyboard.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="mt-2 max-h-96 overflow-auto rounded-lg border border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset"
      >
        {/* Borders on the cells: a collapsed border scrolls away from the sticky header. */}
        <table
          className={`w-full ${wide ? WIDE_MIN_WIDTH_CLASS_NAME : DEFAULT_MIN_WIDTH_CLASS_NAME} border-separate border-spacing-0 text-sm tabular-nums`}
        >
          <caption className="px-3 py-2 text-left font-medium text-fg">{caption}</caption>
          <thead className="sticky top-0 bg-surface-raised">
            <tr className="text-fg *:border-b *:border-line-strong">
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Year
              </th>
              {columns.map(({ header }) => (
                <th key={header} scope="col" className="px-3 py-2 text-right font-semibold">
                  {wide ? (
                    <span className="inline-block max-w-32 text-balance">{header}</span>
                  ) : (
                    header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((year) => (
              <tr key={year} className="*:border-b *:border-line-subtle last:*:border-b-0">
                <th scope="row" className="px-3 py-2 text-left font-medium text-fg">
                  {year}
                </th>
                {columns.map(({ header, values, format }) => {
                  const value = values[year - startYear];
                  return (
                    <td key={header} className="px-3 py-2 text-right text-fg-body">
                      {value === null ? EMPTY_CELL : format(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
