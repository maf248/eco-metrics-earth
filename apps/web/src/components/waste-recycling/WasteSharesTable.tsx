import { DataTableDisclosure } from '@/components/DataTableDisclosure';
import { ScrollRegion } from '@/components/ScrollRegion';
import { formatShare } from '@/lib/formatNumber';

interface ShareRow {
  code: string;
  name: string;
  year: number;
  /** One share per column, `null` when the source does not report it. */
  shares: (number | null)[];
}

interface WasteSharesTableProps {
  caption: string;
  /** Said after "View data table" to tell the tables apart. */
  srLabel: string;
  columns: readonly string[];
  rows: readonly ShareRow[];
}

/**
 * Text equivalent of a stacked-bar chart. A share the source does not report reads "not reported".
 */
export function WasteSharesTable({
  caption,
  srLabel,
  columns,
  rows,
}: Readonly<WasteSharesTableProps>) {
  return (
    <DataTableDisclosure srLabel={srLabel}>
      <ScrollRegion label={caption} className="mt-2 max-h-96">
        <table className="w-full min-w-3xl border-separate border-spacing-0 text-sm tabular-nums">
          <caption className="px-3 py-2 text-left font-medium text-fg">{caption}</caption>
          <thead className="sticky top-0 bg-surface-card">
            <tr className="text-fg *:border-b *:border-line-strong">
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Country
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                Data year
              </th>
              {columns.map((column) => (
                <th key={column} scope="col" className="px-3 py-2 text-right font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-fg-body">
            {rows.map(({ code, name, year, shares }) => (
              <tr key={code} className="*:border-b *:border-line-subtle">
                <th scope="row" className="px-3 py-1.5 text-left font-medium text-fg">
                  {name}
                </th>
                <td className="px-3 py-1.5 text-right">{year}</td>
                {shares.map((share, index) => (
                  <td key={columns[index]} className="px-3 py-1.5 text-right">
                    {share === null ? (
                      <span className="text-fg-muted">not reported</span>
                    ) : (
                      `${formatShare(share)}%`
                    )}
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
