'use client';

import { useId } from 'react';

interface YearSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (year: number) => void;
  /** Accessible name of the range input. */
  label: string;
}

/** Native thumbs are about 16 px wide; the bubble and ticks follow the thumb's center. */
const THUMB_WIDTH_PX = 16;

/** Horizontal position of a year's thumb center, as a CSS length. */
function thumbOffset(year: number, min: number, max: number): string {
  const ratio = max === min ? 0 : (year - min) / (max - min);
  return `calc(${ratio * 100}% + ${THUMB_WIDTH_PX / 2 - ratio * THUMB_WIDTH_PX}px)`;
}

/** Labelled scale years: the ends plus round years far enough from them not to collide. */
function scaleYears(min: number, max: number): { year: number; labelled: boolean }[] {
  const span = max - min;
  const labelStep = span > 150 ? 50 : span > 60 ? 20 : 10;
  // Wide enough for a four-digit label beside an end label on a ~290 px phone track.
  const margin = span * 0.15;
  const ticks: { year: number; labelled: boolean }[] = [{ year: min, labelled: true }];
  for (let year = Math.ceil((min + 1) / 10) * 10; year < max; year += 10) {
    const clear = year - min > margin && max - year > margin;
    ticks.push({ year, labelled: clear && year % labelStep === 0 });
  }
  ticks.push({ year: max, labelled: true });
  return ticks;
}

/**
 * A native range input (keyboard, touch and screen readers for free) with the selected year in
 * a bubble that rides the thumb and a small year scale below.
 */
export function YearSlider({ min, max, value, onChange, label }: YearSliderProps) {
  const id = useId();

  return (
    <div className="px-1 pt-9">
      <div className="relative">
        {/* Visual only: the range input already announces its value, and an `<output>` is a
            live region that would announce every step a second time. */}
        <output
          htmlFor={id}
          aria-hidden="true"
          data-testid="year-slider-value"
          className="pointer-events-none absolute -top-9 -translate-x-1/2 rounded-md bg-accent-solid-strong px-2 py-0.5 text-sm font-semibold tabular-nums text-on-accent"
          style={{ left: thumbOffset(value, min, max) }}
        >
          {value}
        </output>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={label}
          className="block h-6 w-full cursor-pointer accent-accent-solid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset"
        />
        <div aria-hidden="true" className="relative mt-0.5 h-5">
          {scaleYears(min, max).map(({ year, labelled }) => (
            <span
              key={year}
              className="absolute flex -translate-x-1/2 flex-col items-center text-[11px] tabular-nums text-fg-muted"
              style={{ left: thumbOffset(year, min, max) }}
            >
              <span className="block h-1.5 w-px bg-line-strong" />
              {labelled ? year : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
