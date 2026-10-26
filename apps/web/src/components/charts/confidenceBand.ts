/** Opacity of the shaded band: low enough to read the line over it. */
export const BAND_OPACITY = 0.2;

const BAND_STACK = 'confidence-band';

interface ConfidenceBandInput {
  /**
   * The main series' name. The band shares it, so ECharts gives the band the
   * same palette color as the line: the option never names a color.
   */
  name: string;
  /** Lower bound per category; `null` where missing. */
  lower: (number | null)[];
  /** Upper bound per category; `null` where missing. */
  upper: (number | null)[];
}

interface BandSeries {
  type: 'line';
  name: string;
  stack: string;
  stackStrategy: 'all';
  showSymbol: false;
  silent: true;
  connectNulls: false;
  emphasis: { disabled: true };
  tooltip: { show: false };
  data: (number | null)[];
  lineStyle: { opacity: number };
  areaStyle?: { opacity: number };
}

const stackedLine = {
  type: 'line',
  stack: BAND_STACK,
  // Bounds can be negative: stack them all, not only values of the same sign.
  stackStrategy: 'all',
  showSymbol: false,
  silent: true,
  connectNulls: false,
  emphasis: { disabled: true },
  // The tooltip is formatted by the chart option, which prints the interval once.
  tooltip: { show: false },
} as const;

/** `upper - lower` without floating point residue; `null` when either bound is missing. */
function intervalWidth(lower: number | null, upper: number | null): number | null {
  return lower === null || upper === null ? null : Number((upper - lower).toFixed(10));
}

/**
 * A confidence band as two stacked line series: an invisible base at the lower
 * bound and the interval width on top of it with a low-opacity area and no line.
 * Missing bounds leave a gap, not a zero. Pure and color-free.
 */
export function buildConfidenceBandSeries({
  name,
  lower,
  upper,
}: ConfidenceBandInput): [BandSeries, BandSeries] {
  return [
    {
      ...stackedLine,
      name,
      data: lower.map((value, index) => (upper[index] === null ? null : value)),
      lineStyle: { opacity: 0 },
    },
    {
      ...stackedLine,
      name,
      data: upper.map((value, index) => intervalWidth(lower[index], value)),
      lineStyle: { opacity: 0 },
      areaStyle: { opacity: BAND_OPACITY },
    },
  ];
}
