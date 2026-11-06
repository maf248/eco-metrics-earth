import type { EChartsCoreOption } from 'echarts/core';

/** Legend geometry, set explicitly so the row estimate uses the numbers ECharts draws with. */
const PADDING = 5;
const ITEM_GAP = 8;
const ITEM_WIDTH = 25;
const ITEM_HEIGHT = 14;
/** ECharts puts 5 px between an item's icon and its text. */
const ICON_TEXT_GAP = 5;
/**
 * Width in px of each printable ASCII character (codes 32 to 126) in the 12 px legend font: the
 * widest of DejaVu Sans, Liberation Sans and Arial as Chromium, WebKit and Firefox measure it,
 * rounded up. DejaVu Sans, the widest common system sans-serif, sets most entries; Helvetica,
 * Roboto, Segoe UI and San Francisco are expected to be narrower (not measured: they were not
 * installed where the table was built). Summing the entries never gives a label narrower than
 * these fonts draw it, without the spare row a flat per-character estimate reserves.
 */
const CHAR_WIDTHS: readonly number[] = [
  3.9, 4.9, 5.6, 10.1, 7.7, 11.5, 9.4, 3.3, 4.7, 4.7, 6, 10.1, 3.9, 4.4, 3.9, 4.1, 7.7, 7.7, 7.7,
  7.7, 7.7, 7.7, 7.7, 7.7, 7.7, 7.7, 4.1, 4.1, 10.1, 10.1, 10.1, 6.7, 12.2, 8.3, 8.3, 8.7, 9.3, 8.1,
  7.4, 9.4, 9.1, 3.6, 6, 8.1, 6.7, 10.4, 9, 9.5, 8.1, 9.5, 8.7, 8.1, 7.4, 8.8, 8.3, 11.9, 8.3, 8.1,
  8.3, 4.7, 4.1, 4.7, 10.1, 6.7, 6, 7.4, 7.7, 6.6, 7.7, 7.4, 4.3, 7.7, 7.7, 3.4, 3.4, 7, 3.4, 11.7,
  7.7, 7.4, 7.7, 7.7, 5, 6.3, 4.8, 7.7, 7.2, 9.9, 7.2, 7.2, 6.4, 7.7, 4.1, 7.7, 10.1,
];
const FIRST_CHAR_CODE = 32;
/** Any character outside the table counts as the widest one in it ("@"). */
const FALLBACK_CHAR_WIDTH = Math.max(...CHAR_WIDTHS);
/** Rounding and sub-pixel layout slack per label. */
const LABEL_SLACK = 1;

export interface MediaEntry<T> {
  /** Absent on the default entry, which ECharts re-applies when no query matches any more. */
  query?: { maxWidth: number };
  option: T;
}

export interface WrappedLegend<T> {
  legend: EChartsCoreOption;
  /** What `reserve` returns for a one-row legend: spread into the root option. */
  reserved: T;
  /**
   * The one-row default first (ECharts reverts to it when a chart widens past every query),
   * then one entry per extra row, widest first, so the narrowest matching query applies last.
   */
  media: MediaEntry<T>[];
}

function textWidth(label: string): number {
  let width = 0;
  for (const char of label) {
    width += CHAR_WIDTHS[(char.codePointAt(0) ?? 0) - FIRST_CHAR_CODE] ?? FALLBACK_CHAR_WIDTH;
  }
  return width;
}

function itemWidth(label: string): number {
  return ITEM_WIDTH + ICON_TEXT_GAP + textWidth(label) + LABEL_SLACK;
}

/** Rows ECharts needs at most for the items at a chart width (greedy packing, like its layout). */
export function legendRows(labels: readonly string[], chartWidth: number): number {
  const available = chartWidth - 2 * PADDING;
  let rows = 1;
  let rowWidth = 0;
  for (const label of labels) {
    const width = itemWidth(label);
    if (rowWidth > 0 && rowWidth + ITEM_GAP + width > available) {
      rows += 1;
      rowWidth = width;
    } else {
      rowWidth += (rowWidth > 0 ? ITEM_GAP : 0) + width;
    }
  }
  return rows;
}

/** Height of a legend with this many rows, padding included (a 12 px label is icon-high). */
export function legendHeight(rows: number): number {
  return 2 * PADDING + rows * ITEM_HEIGHT + (rows - 1) * ITEM_GAP;
}

/** Largest chart width that still needs at least `rows` rows (rows only fall as width grows). */
function maxWidthFor(labels: readonly string[], rows: number, upper: number): number {
  let low = 1;
  let high = upper;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (legendRows(labels, mid) >= rows) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low;
}

/**
 * A legend that wraps onto as many rows as it needs, at the bottom of the chart, plus what
 * keeps the plot clear of it: ECharts never moves a grid or a pie away from its legend, so
 * `reserve` turns a legend height into the chart's own room for it (for example `grid.bottom`)
 * and ECharts' `media` queries re-apply it per chart width on every resize.
 */
export function wrappedLegend<T extends EChartsCoreOption>(
  labels: readonly string[],
  reserve: (legendHeight: number) => T,
): WrappedLegend<T> {
  // Wide enough for every label on one row.
  const oneRowWidth = labels.reduce((sum, label) => sum + itemWidth(label) + ITEM_GAP, 2 * PADDING);
  const reserved = reserve(legendHeight(1));
  const media: MediaEntry<T>[] = [{ option: reserved }];
  // At most one label per row.
  for (let rows = 2; rows <= labels.length; rows += 1) {
    media.push({
      query: { maxWidth: maxWidthFor(labels, rows, oneRowWidth) },
      option: reserve(legendHeight(rows)),
    });
  }

  return {
    legend: {
      type: 'plain',
      show: true,
      left: 'center',
      bottom: 0,
      padding: PADDING,
      itemGap: ITEM_GAP,
      itemWidth: ITEM_WIDTH,
      itemHeight: ITEM_HEIGHT,
      icon: 'roundRect',
    },
    reserved,
    media,
  };
}
