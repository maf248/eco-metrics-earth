import { CHART_NO_DATA_TOKEN, CHART_RAMP_TOKENS, type ChartRamp } from './chartTokens';

interface MapLegendProps {
  /** One label per class of the sequential palette, low to high. */
  classLabels: readonly string[];
  /** Names the list for assistive technology (the quantity and unit). */
  label: string;
  /** The ramp the map colors its classes with; heat when omitted. */
  ramp?: ChartRamp;
}

const SWATCH_CLASS_NAME = 'block h-2.5 w-7 rounded-sm ring-1 ring-line-strong';

/**
 * HTML legend of a choropleth: a small swatch per class with its label underneath, then
 * "No data". Swatches read the same tokens the theme adapter gives the map.
 */
export function MapLegend({ classLabels, label, ramp = 'heat' }: Readonly<MapLegendProps>) {
  const items = [
    ...classLabels.map((text, index) => ({ text, token: CHART_RAMP_TOKENS[ramp][index] })),
    { text: 'No data', token: CHART_NO_DATA_TOKEN },
  ];

  return (
    <ul
      aria-label={label}
      className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-2 text-[11px] text-fg-secondary sm:gap-x-4 sm:text-xs"
    >
      {items.map(({ text, token }) => (
        <li key={text} className="flex flex-col items-center gap-1 leading-tight">
          <span
            aria-hidden="true"
            data-token={token}
            className={SWATCH_CLASS_NAME}
            style={{ background: `var(--${token})` }}
          />
          <span className="whitespace-nowrap">{text}</span>
        </li>
      ))}
    </ul>
  );
}
