'use client';

import { useEffect, useRef } from 'react';

import { CountryFlag } from '@/components/CountryFlag';
import { DataTableDisclosure } from '@/components/DataTableDisclosure';
import { ScrollRegion } from '@/components/ScrollRegion';
import { SortHeader } from '@/components/SortHeader';
import {
  RANKING_MIN_FIRST_AREA_HA,
  roundPercent,
  type ForestRankingKey,
  type ForestRankingRow,
  type ForestRankingSort,
} from '@/lib/forestChange';
import { formatSignedPercent, formatSignedWhole, formatWhole } from '@/lib/formatNumber';
import { scrollRowIntoRegion } from '@/lib/scrollRowIntoRegion';

interface ForestRankingTableProps {
  rows: readonly ForestRankingRow[];
  /** Countries the percentage measure does not rank (listed after the ranked ones). */
  unrankedByPercent: number;
  startYear: number;
  endYear: number;
  sort: ForestRankingSort;
  onSortChange: (sort: ForestRankingSort) => void;
  /** Entity code of the selected country, or `null`. */
  selectedCode: string | null;
  /** Called with a row's entity code when its country button is activated. */
  onSelect: (code: string) => void;
}

const EMPTY_CELL = '—';
const THOUSAND = 1_000;
const MEASURE_LABELS: Record<ForestRankingKey, string> = {
  hectares: 'net change in forest area',
  percent: 'percentage change in forest area',
};
// The last column keeps sm's 12 px at the right: the region reaches the screen edge below sm.
const CELL_CLASS_NAME = 'px-1 py-1.5 text-right last:pr-3 sm:px-3';

/** The note under the table: who is ranked by percentage, and how many countries are not. */
export function rankingThresholdNote(startYear: number, unranked: number): string {
  const threshold = formatWhole(RANKING_MIN_FIRST_AREA_HA / 1_000_000);
  const base = `Percentage change is ranked only for countries with at least ${threshold} million hectares of forest in ${startYear}`;
  if (unranked === 0) {
    return `${base}.`;
  }
  const countries = unranked === 1 ? '1 country is' : `${formatWhole(unranked)} countries are`;
  return `${base} (${countries} listed after the ranked ones).`;
}

/**
 * Countries ranked by net change in forest area, as indexable, keyboard-reachable text: the
 * comparison the map shows, collapsed under "View data table". Sortable by net change or by
 * percentage change, either way (the first press lists the largest loss first); the selected
 * country's row is highlighted and kept in view.
 */
export function ForestRankingTable({
  rows,
  unrankedByPercent,
  startYear,
  endYear,
  sort,
  onSortChange,
  selectedCode,
  onSelect,
}: ForestRankingTableProps) {
  const regionRef = useRef<HTMLDivElement>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  // The selected row moves when the selection or the order changes. A closed table has no
  // layout, so opening it reveals the row too (`onToggle` below).
  useEffect(() => {
    scrollRowIntoRegion(regionRef.current, selectedRowRef.current);
  }, [selectedCode, sort]);

  const measure = MEASURE_LABELS[sort.key];
  const columns: { key: ForestRankingKey; label: string; unit: string }[] = [
    { key: 'hectares', label: 'Net change', unit: 'thousand ha' },
    { key: 'percent', label: 'Change', unit: `% of ${startYear}` },
  ];

  return (
    <DataTableDisclosure
      // Two tables on the page share the visible text; the name says which one this is.
      srLabel="countries ranked by change in forest area"
      onToggle={(event) => {
        if (event.currentTarget.open) {
          scrollRowIntoRegion(regionRef.current, selectedRowRef.current);
        }
      }}
    >
      <ScrollRegion
        label={`Countries ranked by ${measure}, ${startYear} to ${endYear}`}
        className="relative mt-2 max-h-96"
        testId="forest-ranking-region"
        ref={regionRef}
      >
        {/* Borders on the cells: a collapsed border scrolls away from the sticky header. */}
        <table className="w-full border-separate border-spacing-0 text-[13px] tabular-nums sm:text-sm">
          <caption className="px-3 py-2 text-left font-medium text-fg">
            {`Countries ranked by ${measure}, ${startYear} to ${endYear}`}
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
              {columns.map(({ key, label, unit }) => (
                <SortHeader
                  key={key}
                  active={sort.key === key}
                  order={sort.order}
                  firstOrder="ascending"
                  onSort={(order) => onSortChange({ key, order })}
                  className="px-1 py-1 text-right font-semibold last:pr-3 sm:px-3"
                >
                  <span className="flex flex-col items-end">
                    <span className="sm:whitespace-nowrap">{label}</span>
                    <span className="text-xs font-normal">{unit}</span>
                  </span>
                </SortHeader>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ rank, entity, hectares, percent }) => {
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
                    {hectares === null ? EMPTY_CELL : formatSignedWhole(hectares / THOUSAND)}
                  </td>
                  <td className={`${CELL_CLASS_NAME} text-fg-body`}>
                    {percent === null ? EMPTY_CELL : formatSignedPercent(roundPercent(percent))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollRegion>
      <p className="mt-2 text-xs text-fg-muted" data-testid="forest-ranking-note">
        {rankingThresholdNote(startYear, unrankedByPercent)}
      </p>
    </DataTableDisclosure>
  );
}
