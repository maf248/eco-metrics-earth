'use client';

import { useMemo, useRef, useState } from 'react';

import { CountryCombobox, type CountryOption } from '@/components/CountryCombobox';
import { CountryFlag } from '@/components/CountryFlag';
import { CARD_CLASS_NAME, FOCUS_RING_CLASS_NAME } from '@/lib/cardClassNames';
import { defaultComparisonCodes, MAX_COMPARED_COUNTRIES } from '@/lib/wasteMeasures';
import type { WasteCountry } from '@eco-metrics/shared';

import { WasteCompositionBars } from './WasteCompositionBars';
import { WasteTreatmentBars } from './WasteTreatmentBars';

interface WasteComparisonProps {
  countries: readonly WasteCountry[];
}

/** No option is ever "selected" in the combobox: picking a country toggles it in the list. */
const NO_SELECTION = '';
/** The full sentence for assistive technology; the field shows the short one. */
const LIMIT_MESSAGE = `Up to ${MAX_COMPARED_COUNTRIES} countries. Remove one to add another.`;
const LIMIT_ID = 'waste-comparison-limit';
const LIMIT_PLACEHOLDER = `Limit of ${MAX_COMPARED_COUNTRIES} reached`;

/**
 * Countries compared side by side: one selection (the five most populous countries with
 * treatment data to start) shared by the treatment bars and the composition bars. The search
 * adds a country, or removes it when it is already there; at the maximum it is unavailable and
 * says so in the field, so one must be removed to add another.
 */
export function WasteComparison({ countries }: Readonly<WasteComparisonProps>) {
  const [codes, setCodes] = useState<string[]>(() => defaultComparisonCodes(countries));

  const allOptions = useMemo<CountryOption[]>(
    () =>
      countries
        .filter(({ treatment }) => treatment !== undefined)
        .map(({ code, name, iso2 }) => ({ code, name, iso2 })),
    [countries],
  );
  const byCode = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);
  const selected = codes.flatMap((code) => byCode.get(code) ?? []);
  const full = selected.length >= MAX_COMPARED_COUNTRIES;

  const comparing = `Comparing ${selected.length} ${selected.length === 1 ? 'country' : 'countries'}.`;
  const statusMessage = full ? `${comparing} ${LIMIT_MESSAGE}` : comparing;

  const toggle = (code: string): void =>
    setCodes((current) => {
      if (current.includes(code)) {
        return current.filter((item) => item !== code);
      }
      return current.length >= MAX_COMPARED_COUNTRIES ? current : [...current, code];
    });

  const inputRef = useRef<HTMLInputElement>(null);
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());

  /** Removes a chip and keeps focus in the list: the next chip, else the previous, else the search. */
  const removeChip = (code: string): void => {
    const index = selected.findIndex((country) => country.code === code);
    const neighbour = selected[index + 1] ?? selected[index - 1];
    const target = neighbour ? removeButtons.current.get(neighbour.code) : inputRef.current;
    target?.focus();
    toggle(code);
  };

  return (
    <section aria-labelledby="waste-comparison-title" className={`mt-8 ${CARD_CLASS_NAME}`}>
      <h2 id="waste-comparison-title" className="text-xl font-semibold text-fg">
        Compare countries
      </h2>
      <p className="mt-1 text-sm text-fg-secondary">
        Compare up to {MAX_COMPARED_COUNTRIES} countries. The five most populous ones that report
        what happens to their waste come first.
      </p>
      <div className="mt-4">
        <CountryCombobox
          options={allOptions}
          value={NO_SELECTION}
          onChange={toggle}
          label="Add or remove a country"
          disabled={full}
          placeholder={full ? LIMIT_PLACEHOLDER : undefined}
          describedBy={full ? LIMIT_ID : undefined}
          inputRef={inputRef}
        />
        {full && (
          <span id={LIMIT_ID} className="sr-only">
            {LIMIT_MESSAGE}
          </span>
        )}
      </div>
      <ul aria-label="Selected countries" className="mt-3 flex flex-wrap gap-2">
        {selected.map(({ code, name, iso2 }) => (
          <li
            key={code}
            className="flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-well pl-2.5 text-sm text-fg"
          >
            <CountryFlag iso2={iso2} />
            {name}
            <button
              type="button"
              ref={(node) => {
                if (node) {
                  removeButtons.current.set(code, node);
                } else {
                  removeButtons.current.delete(code);
                }
              }}
              aria-label={`Remove ${name}`}
              onClick={() => removeChip(code)}
              className={`relative mr-0.5 flex size-7 items-center justify-center rounded-full text-fg-muted before:absolute before:-inset-2 before:content-[''] hover:text-fg ${FOCUS_RING_CLASS_NAME}`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <p role="status" className="sr-only">
        {statusMessage}
      </p>

      <WasteTreatmentBars countries={selected} />
      <WasteCompositionBars countries={selected} />
    </section>
  );
}
