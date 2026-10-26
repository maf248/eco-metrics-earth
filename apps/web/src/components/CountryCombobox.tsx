'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { CountryFlag } from '@/components/CountryFlag';

export interface CountryOption {
  /** Stable entity code (ISO alpha-3, or an OWID code such as `OWID_WRL`). */
  code: string;
  name: string;
  /** ISO alpha-2 for the flag; `null` shows a globe. */
  iso2: string | null;
}

interface CountryComboboxProps {
  options: CountryOption[];
  /** Code of the selected option. */
  value: string;
  onChange: (code: string) => void;
  label: string;
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset';

/** Lower-cases and strips diacritics so "cote" finds "Côte d'Ivoire". */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Names starting with the query first, then names containing it, then entities
 * whose code starts with it; ties keep the original order.
 */
export function filterCountryOptions(options: CountryOption[], query: string): CountryOption[] {
  const needle = normalize(query.trim());
  if (needle === '') {
    return options;
  }

  const ranked: { option: CountryOption; rank: number }[] = [];
  for (const option of options) {
    const name = normalize(option.name);
    if (name.startsWith(needle)) {
      ranked.push({ option, rank: 0 });
    } else if (name.includes(needle)) {
      ranked.push({ option, rank: 1 });
    } else if (normalize(option.code).startsWith(needle)) {
      ranked.push({ option, rank: 2 });
    }
  }
  // Array.prototype.sort is stable, so equal ranks keep the original order.
  return ranked.sort((a, b) => a.rank - b.rank).map(({ option }) => option);
}

function describeMatches(count: number): string {
  if (count === 0) {
    return 'No countries found';
  }
  return `${count} ${count === 1 ? 'country' : 'countries'} found`;
}

/**
 * Searchable country selector following the WAI-ARIA 1.2 editable combobox
 * pattern with list autocomplete. Hand-built: no UI library.
 */
export function CountryCombobox({ options, value, onChange, label }: CountryComboboxProps) {
  const id = useId();
  const inputId = `${id}-input`;
  const listboxId = `${id}-listbox`;
  const optionId = (index: number): string => `${id}-option-${index}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  // `null` means "not editing": the input shows the selected name and the list is unfiltered.
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selected = options.find((option) => option.code === value);
  const selectedName = selected?.name ?? '';
  const inputValue = query ?? selectedName;
  const results = useMemo(() => filterCountryOptions(options, query ?? ''), [options, query]);
  const hasResults = results.length > 0;
  const activeOption = activeIndex >= 0 ? results[activeIndex] : undefined;

  useEffect(() => {
    if (!open || activeIndex < 0) {
      return;
    }
    // Absent in jsdom.
    listboxRef.current?.children[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex]);

  const close = (): void => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const restore = (): void => {
    close();
    setQuery(null);
  };

  const select = (option: CountryOption): void => {
    onChange(option.code);
    restore();
  };

  const openAt = (index: number): void => {
    setOpen(true);
    setActiveIndex(hasResults ? index : -1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    const last = results.length - 1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) {
          openAt(0);
        } else if (hasResults) {
          setActiveIndex(activeIndex >= last ? 0 : activeIndex + 1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) {
          openAt(last);
        } else if (hasResults) {
          setActiveIndex(activeIndex <= 0 ? last : activeIndex - 1);
        }
        break;
      case 'Home':
        if (open && hasResults) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (open && hasResults) {
          event.preventDefault();
          setActiveIndex(last);
        }
        break;
      case 'Enter':
        if (open && activeOption) {
          event.preventDefault();
          select(activeOption);
        }
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          close();
        } else {
          setQuery(null);
        }
        break;
      case 'Tab':
        restore();
        break;
      default:
    }
  };

  return (
    <div className="relative w-full max-w-sm">
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-fg">
        {label}
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <CountryFlag iso2={selected?.iso2 ?? null} />
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={open && !hasResults ? undefined : listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeOption ? optionId(activeIndex) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search countries"
          value={inputValue}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(filterCountryOptions(options, event.target.value).length > 0 ? 0 : -1);
          }}
          onKeyDown={handleKeyDown}
          onBlur={restore}
          onClick={() => {
            if (!open) {
              openAt(-1);
            }
          }}
          className={`min-h-11 w-full rounded-lg border border-line-strong bg-surface-raised pl-11 pr-11 text-base text-fg placeholder:text-fg-muted ${FOCUS_RING}`}
        />
        {inputValue !== '' && (
          <button
            type="button"
            aria-label="Clear search"
            // Keep focus in the input while the button is pressed.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery('');
              setOpen(true);
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className={`absolute inset-y-0 right-0 flex min-h-11 w-11 items-center justify-center rounded-lg text-fg-muted hover:text-fg ${FOCUS_RING}`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        )}
      </div>

      {open && !hasResults && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-line-strong bg-surface-raised px-3 py-3 text-base text-fg-secondary shadow-lg">
          No countries found
        </div>
      )}
      <ul
        ref={listboxRef}
        id={listboxId}
        role="listbox"
        aria-label={label}
        hidden={!open || !hasResults}
        // Keep focus in the input while an option is pressed.
        onMouseDown={(event) => event.preventDefault()}
        className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-line-strong bg-surface-raised py-1 shadow-lg"
      >
        {open &&
          results.map((option, index) => {
            const active = index === activeIndex;
            return (
              // Keyboard selection is handled on the input (aria-activedescendant pattern).
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={option.code}
                id={optionId(index)}
                role="option"
                aria-selected={active}
                onClick={() => select(option)}
                className={`relative flex min-h-11 cursor-pointer items-center gap-3 px-3 text-base text-fg ${
                  active
                    ? 'bg-hover before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-r before:bg-accent'
                    : ''
                }`}
              >
                <CountryFlag iso2={option.iso2} lazy />
                <span className="min-w-0 flex-1 truncate">{option.name}</span>
                {option.code === value && <span className="sr-only">, selected</span>}
                {option.code === value && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-4 w-4 shrink-0 text-accent"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 10.5l4 4 8-9" />
                  </svg>
                )}
              </li>
            );
          })}
      </ul>

      <div role="status" aria-live="polite" className="sr-only">
        {open ? describeMatches(results.length) : ''}
      </div>
    </div>
  );
}
