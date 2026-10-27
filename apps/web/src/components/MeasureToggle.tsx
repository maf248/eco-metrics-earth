'use client';

import { useId } from 'react';

interface MeasureToggleOption<T extends string> {
  value: T;
  label: string;
}

interface MeasureToggleProps<T extends string> {
  /** Names the radio group for assistive technology (for example `Measure`). */
  legend: string;
  options: MeasureToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
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
}: MeasureToggleProps<T>) {
  const toggleName = useId();

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-sm font-medium text-fg">{legend}</legend>
      <div className="inline-flex rounded-lg border border-line-strong bg-well p-1">
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
                className="flex min-h-11 min-w-24 cursor-pointer items-center justify-center rounded-md px-4 text-base font-medium text-fg-body transition-colors hover:text-fg peer-checked:bg-accent-solid-strong peer-checked:text-on-accent peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring peer-focus-visible:ring-offset-2 ring-offset-focus-offset motion-reduce:transition-none"
              >
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
