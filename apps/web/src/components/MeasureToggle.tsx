'use client';

import { useId } from 'react';

interface MeasureToggleOption<T extends string> {
  value: T;
  label: string;
  /**
   * Shown instead of `label` below `sm` so it fits one line; `label` stays the accessible name
   * and is shown from `sm` up.
   */
  shortLabel?: string;
}

interface MeasureToggleProps<T extends string> {
  /** Names the radio group for assistive technology (for example `Measure`). */
  legend: string;
  options: MeasureToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Below `sm`, lays the options out as a compact equal-width two-column grid instead of one row. */
  grid?: boolean;
}

/**
 * The radio group that switches between the measures of a chart, drawn as a
 * segmented button. It holds no state of its own and knows no category: the
 * caller owns the selected value.
 */
export function MeasureToggle<T extends string>({
  legend,
  options,
  value,
  onChange,
  grid = false,
}: MeasureToggleProps<T>) {
  const toggleName = useId();

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-sm font-medium text-fg">{legend}</legend>
      <div
        className={`rounded-lg border border-line-strong bg-well p-1 ${grid ? 'grid grid-cols-2 gap-1 sm:inline-flex sm:gap-0' : 'inline-flex'}`}
      >
        {options.map((option) => {
          const inputId = `${toggleName}-${option.value}`;
          return (
            <div key={option.value} className="relative">
              <input
                id={inputId}
                type="radio"
                name={toggleName}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <label
                htmlFor={inputId}
                className={`flex min-h-11 min-w-24 cursor-pointer items-center justify-center rounded-md px-4 text-center text-base font-medium text-fg-body transition-colors hover:text-fg peer-checked:bg-accent-solid-strong peer-checked:text-on-accent peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring peer-focus-visible:ring-offset-2 ring-offset-focus-offset motion-reduce:transition-none${grid ? ' max-sm:min-w-0 max-sm:px-2 max-sm:text-sm' : ''}`}
              >
                {option.shortLabel ? (
                  <>
                    <span aria-hidden="true" className="sm:hidden">
                      {option.shortLabel}
                    </span>
                    <span className="sr-only sm:not-sr-only">{option.label}</span>
                  </>
                ) : (
                  option.label
                )}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
