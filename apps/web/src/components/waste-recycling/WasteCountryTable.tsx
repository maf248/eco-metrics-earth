'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { CountryFlag } from '@/components/CountryFlag';
import { DataTableDisclosure } from '@/components/DataTableDisclosure';
import { ScrollRegion } from '@/components/ScrollRegion';
import { SortHeader } from '@/components/SortHeader';
import { FOCUS_RING_CLASS_NAME } from '@/lib/cardClassNames';
import { scrollRowIntoRegion } from '@/lib/scrollRowIntoRegion';
import {
  formatMeasureValue,
  measureDefinition,
  rankWasteCountries,
  WASTE_MEASURES,
  type WasteMeasure,
  type WasteSort,
} from '@/lib/wasteMeasures';
import type { WasteCountry } from '@eco-metrics/shared';

interface WasteCountryTableProps {
  countries: readonly WasteCountry[];
  /** The measure shown on the map: only countries that report it can be selected. */
  mapMeasure: WasteMeasure;
  sort: WasteSort;
  onSortChange: (sort: WasteSort) => void;
  /** Code of the selected country, or `null`. */
  selectedCode: string | null;
  /** Called with a country's code when its name button is activated. */
  onSelect: (code: string) => void;
}

const EMPTY_CELL = '—';

/** Lower-cases and strips diacritics so "cote" finds "Côte d'Ivoire". */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Every country with its rank and measures: the text equivalent of the map. A value the country
 * does not report is "—", and a partly reported one says which part is missing.
 */
export function WasteCountryTable({
  countries,
  mapMeasure,
  sort,
  onSortChange,
  selectedCode,
  onSelect,
}: Readonly<WasteCountryTableProps>) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const regionRef = useRef<HTMLDivElement>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  const ranked = useMemo(() => rankWasteCountries(countries, sort), [countries, sort]);
  const rows = useMemo(() => {
    const needle = normalize(query.trim());
    return needle === ''
      ? ranked
      : ranked.filter(({ country }) => normalize(country.name).includes(needle));
  }, [ranked, query]);
  const mapIndex = WASTE_MEASURES.findIndex(({ value }) => value === mapMeasure);

  // The selected row moves when the selection, the order or the search changes. A closed table
  // has no layout, so opening it reveals the row too (`onToggle` below).
  useEffect(() => {
    scrollRowIntoRegion(regionRef.current, selectedRowRef.current);
  }, [selectedCode, sort, query]);

  const sortTitle = measureDefinition(sort.measure).title;

  return (
    <DataTableDisclosure
      srLabel="every country"
      onToggle={(event) => {
        if (event.currentTarget.open) {
          scrollRowIntoRegion(regionRef.current, selectedRowRef.current);
        }
      }}
    >
      <div className="mt-2">
        <label htmlFor={searchId} className="mb-1 block text-sm font-medium text-fg">
          Search countries in the table
        </label>
        <input
          id={searchId}
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search countries"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={`min-h-11 w-full max-w-sm rounded-lg border border-line-strong bg-surface-raised px-3 text-base text-fg placeholder:text-fg-muted ${FOCUS_RING_CLASS_NAME}`}
        />
        <p role="status" className="sr-only">
          {`${rows.length} ${rows.length === 1 ? 'country' : 'countries'} listed`}
        </p>
      </div>

      <ScrollRegion
        label="Countries and their waste measures"
        className="relative mt-2 max-h-96"
        testId="waste-country-region"
        ref={regionRef}
      >
        {/* Borders on the cells: a collapsed border scrolls away from the sticky header. */}
        <table className="w-full border-separate border-spacing-0 text-[13px] tabular-nums sm:text-sm">
          <caption className="px-3 py-2 text-left font-medium text-fg">
            {`Countries sorted by: ${sortTitle}. "${EMPTY_CELL}" means the country does not report it.`}
          </caption>
          <thead className="sticky top-0 z-10 bg-surface-card">
            <tr className="text-fg *:border-b *:border-line-strong">
              <th
                scope="col"
                className="w-px whitespace-nowrap px-1.5 py-2 text-right font-semibold"
              >
                Rank
              </th>
              <th scope="col" className="w-full px-2 py-2 text-left font-semibold">
                Country
              </th>
              {WASTE_MEASURES.map(({ value, label }) => (
                <SortHeader
                  key={value}
                  active={sort.measure === value}
                  order={sort.order}
                  onSort={(order) => onSortChange({ measure: value, order })}
                  className="px-1.5 py-1 text-right font-semibold sm:px-3"
                >
                  <span>{label}</span>
                </SortHeader>
              ))}
            </tr>
          </thead>
          <tbody className="text-fg-body">
            {rows.map(({ rank, country, readings }) => {
              const selected = country.code === selectedCode;
              const selectable = readings[mapIndex].value !== null;
              return (
                <tr
                  key={country.code}
                  ref={selected ? selectedRowRef : undefined}
                  className={`*:border-b *:border-line-subtle ${selected ? 'bg-well' : ''}`}
                >
                  <td className="whitespace-nowrap px-1.5 py-1.5 text-right align-top text-fg-muted">
                    {rank ?? EMPTY_CELL}
                  </td>
                  <th scope="row" className="px-2 text-left align-top font-medium text-fg">
                    {/* The flag stays beside the first line of a name that wraps. */}
                    <span className="flex items-start gap-2">
                      <span className="mt-3.5 flex h-4 w-[1.3333rem] shrink-0">
                        {country.iso2 !== null && <CountryFlag iso2={country.iso2} lazy />}
                      </span>
                      {selectable ? (
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => onSelect(country.code)}
                          className={`rounded-md py-3 text-left hover:text-accent ${FOCUS_RING_CLASS_NAME}`}
                        >
                          {country.name}
                        </button>
                      ) : (
                        <span className="py-3">{country.name}</span>
                      )}
                    </span>
                  </th>
                  {WASTE_MEASURES.map(({ value: measureKey }, index) => {
                    const reading = readings[index];
                    return (
                      <td key={measureKey} className="px-1.5 py-1.5 text-right align-top sm:px-3">
                        {reading.value === null ? (
                          EMPTY_CELL
                        ) : (
                          <>
                            <span className="whitespace-nowrap">
                              {formatMeasureValue(measureKey, reading.value)}
                            </span>
                            <span className="block whitespace-nowrap text-xs text-fg-muted">
                              {reading.yearLabel}
                            </span>
                            {reading.note && (
                              <span className="ml-auto block max-w-24 text-xs text-fg-muted sm:max-w-36">
                                {reading.note}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-3 py-4 text-fg-secondary">No countries found</p>}
      </ScrollRegion>
    </DataTableDisclosure>
  );
}
