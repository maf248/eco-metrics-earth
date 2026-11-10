'use client';

import { useEffect, useRef } from 'react';

import { CountryFlag } from '@/components/CountryFlag';
import { TABLE_REGION_CLASS_NAME } from '@/lib/cardClassNames';
import type { Co2RankingRow, RankingKey, RankingOrder, RankingSort } from '@/lib/co2Ranking';
import { formatPerCapita, formatTotal } from '@/lib/formatNumber';

interface Co2RankingTableProps {
  rows: readonly Co2RankingRow[];
  year: number;
  sort: RankingSort;
  onSortChange: (sort: RankingSort) => void;
  /** Entity code of the selected country, or `null`. */
  selectedCode: string | null;
  /** Called with a row's entity code when its country button is activated. */
  onSelect: (code: string) => void;
}

const EMPTY_CELL = '—';
const ORDER_LABELS: Record<RankingOrder, string> = {
  descending: 'highest first',
  ascending: 'lowest first',
};
const MEASURE_LABELS: Record<RankingKey, string> = {
  perCapita: 'CO2 emissions per capita',
  total: 'total CO2 emissions',
};
const COLUMNS: { key: RankingKey; label: string; unit: string; unitTitle: string }[] = [
  { key: 'perCapita', label: 'Per capita', unit: 't/person', unitTitle: 'tonnes per person' },
  { key: 'total', label: 'Total', unit: 'Mt', unitTitle: 'million tonnes' },
];
// The last column keeps sm's 12 px at the right: the region reaches the screen edge below sm.
const CELL_CLASS_NAME = 'px-1 py-1.5 text-right last:pr-3 sm:px-3';

/** Keeps `row` visible inside `region` by scrolling the region only, never the page. */
function scrollRowIntoRegion(region: HTMLElement | null, row: HTMLElement | null): void {
  if (!region || !row) {
    return;
  }
  const header = region.querySelector('thead')?.getBoundingClientRect().height ?? 0;
  const top = row.offsetTop - header;
  const bottom = row.offsetTop + row.offsetHeight;
  if (top < region.scrollTop) {
    region.scrollTop = top;
  } else if (bottom > region.scrollTop + region.clientHeight) {
    region.scrollTop = bottom - region.clientHeight;
  }
}

function SortArrow({ order }: { order: RankingOrder }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`size-3.5 shrink-0 transition-transform motion-reduce:transition-none sm:size-4 ${order === 'ascending' ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3v10M4 9l4 4 4-4" />
    </svg>
  );
}

/**
 * A sortable column header. The active column shows its order in accent; pressing it reverses
 * the order, pressing the other column sorts by it, highest first. The accessible name starts
 * with the visible text (WCAG 2.5.3) and then says the order and what a press does.
 */
function SortHeader({
  column,
  sort,
  onSortChange,
}: {
  column: (typeof COLUMNS)[number];
  sort: RankingSort;
  onSortChange: (sort: RankingSort) => void;
}) {
  const active = sort.key === column.key;
  const next: RankingSort = active
    ? { key: column.key, order: sort.order === 'descending' ? 'ascending' : 'descending' }
    : { key: column.key, order: 'descending' };
  const state = active ? `, ${ORDER_LABELS[sort.order]}` : '';

  return (
    <th
      scope="col"
      aria-sort={active ? sort.order : undefined}
      className="px-1 py-1 text-right font-semibold last:pr-3 sm:px-3"
    >
      <button
        type="button"
        onClick={() => onSortChange(next)}
        className={`ml-auto inline-flex min-h-11 items-center gap-1 rounded-md text-right leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${active ? 'text-accent hover:text-accent-hover' : 'text-fg hover:text-accent'}`}
      >
        <span className="flex flex-col items-end">
          <span className="sm:whitespace-nowrap">{column.label}</span>
          <span className="text-xs font-normal">
            <abbr title={column.unitTitle} className="no-underline">
              {column.unit}
            </abbr>
          </span>
          <span className="sr-only">
            {state}. Sort {ORDER_LABELS[next.order]}
          </span>
        </span>
        <span className={active ? '' : 'opacity-40'}>
          <SortArrow order={active ? sort.order : 'descending'} />
        </span>
      </button>
    </th>
  );
}

/**
 * Countries compared in the selected year, as indexable, keyboard-reachable text: the
 * comparison the map shows, collapsed under "View data table" like every other data table.
 * Sortable by emissions per capita or total, either way; the selected country's row is marked
 * and kept in view.
 */
export function Co2RankingTable({
  rows,
  year,
  sort,
  onSortChange,
  selectedCode,
  onSelect,
}: Co2RankingTableProps) {
  const regionRef = useRef<HTMLDivElement>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  // The selected row moves when the selection, the year or the order changes. A closed table
  // has no layout, so opening it reveals the row too (`onToggle` below).
  useEffect(() => {
    scrollRowIntoRegion(regionRef.current, selectedRowRef.current);
  }, [selectedCode, year, sort]);

  const measure = MEASURE_LABELS[sort.key];

  return (
    <details
      className="group mt-4 border-t border-line-subtle pt-2"
      onToggle={(event) => {
        if (event.currentTarget.open) {
          scrollRowIntoRegion(regionRef.current, selectedRowRef.current);
        }
      }}
    >
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
        {/* Two tables on the page share the visible text; the name says which one this is. */}
        <span className="sr-only">: countries ranked</span>
      </summary>

      <div
        role="region"
        aria-label={`Countries ranked by ${measure} in ${year}, scrollable`}
        // Focusable so the scroll region can be scrolled by keyboard.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        ref={regionRef}
        data-testid="co2-ranking-region"
        // Below `sm` it spans the card edge to edge like the charts, so four columns fit.
        className={`relative mt-2 max-h-96 overflow-auto ${TABLE_REGION_CLASS_NAME}`}
      >
        {/* Borders on the cells: a collapsed border scrolls away from the sticky header. */}
        <table className="w-full border-separate border-spacing-0 text-[13px] tabular-nums sm:text-sm">
          <caption className="px-3 py-2 text-left font-medium text-fg">
            {`Countries ranked by ${measure}, ${year}`}
          </caption>
          <thead className="sticky top-0 z-10 bg-surface-card">
            <tr className="text-fg *:border-b *:border-line-strong">
              <th scope="col" className="w-7 px-1 py-2 text-right font-semibold sm:w-12 sm:px-3">
                <span aria-hidden="true" className="sm:hidden">
                  #
                </span>
                <span className="sr-only sm:not-sr-only">Rank</span>
              </th>
              <th scope="col" className="px-1.5 py-2 text-left font-semibold sm:px-3">
                Country
              </th>
              {COLUMNS.map((column) => (
                <SortHeader
                  key={column.key}
                  column={column}
                  sort={sort}
                  onSortChange={onSortChange}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ rank, entity, perCapita, total }) => {
              const selected = entity.code === selectedCode;
              return (
                <tr
                  key={entity.code}
                  ref={selected ? selectedRowRef : undefined}
                  aria-current={selected ? 'true' : undefined}
                  className={`*:border-b *:border-line-subtle last:*:border-b-0 ${selected ? 'bg-hover' : ''}`}
                >
                  <td
                    className={`${CELL_CLASS_NAME} ${selected ? 'font-semibold text-accent' : 'text-fg-muted'}`}
                  >
                    {rank ?? EMPTY_CELL}
                  </td>
                  <th scope="row" className="px-0.5 py-0.5 text-left font-medium text-fg sm:px-1">
                    <button
                      type="button"
                      onClick={() => onSelect(entity.code)}
                      aria-pressed={selected}
                      className={`flex min-h-11 w-full items-center gap-1.5 rounded-md px-1 text-left hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring sm:gap-2 sm:px-2 ${selected ? 'text-accent' : ''}`}
                    >
                      <CountryFlag iso2={entity.iso2} lazy />
                      <span className="hyphens-auto">{entity.name}</span>
                    </button>
                  </th>
                  <td className={`${CELL_CLASS_NAME} text-fg-body`}>
                    {formatPerCapita(perCapita)}
                  </td>
                  <td className={`${CELL_CLASS_NAME} text-fg-body`}>
                    {total === null ? EMPTY_CELL : formatTotal(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
