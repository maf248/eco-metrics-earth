'use client';

import type { EChartsCoreOption } from 'echarts/core';
import type { CSSProperties, ReactNode } from 'react';

import type { ChartPalette } from '@/components/charts/chartTokens';
import { LazyBarEChart } from '@/components/charts/LazyBarEChart';
import { RenderWhenVisible } from '@/components/charts/RenderWhenVisible';
import type { BarsChartHeights } from '@/lib/wasteChartOption';

import { WasteSharesTable } from './WasteSharesTable';

interface WasteGroupBarsProps {
  /** Visible title above the chart. */
  title: string;
  /** Extra top margin classes of the title (the second chart of a card sits further down). */
  titleClassName: string;
  /** The stacked-bar option, built from the rows below. */
  option: EChartsCoreOption;
  palette: ChartPalette;
  /** Height of the chart box and its placeholder, from the number of bars and the legend rows. */
  heights: BarsChartHeights;
  /** Text equivalent of the chart. */
  table: {
    caption: string;
    srLabel: string;
    columns: readonly string[];
    rows: readonly { code: string; name: string; year: number; shares: (number | null)[] }[];
  };
  /** Shown after the table, for example the countries the chart leaves out. */
  children?: ReactNode;
}

/**
 * A stacked-bar chart of shares per country with its data table: one component for what happens
 * to the waste and what it is made of. The chart is below the fold, so it loads when it scrolls
 * near the viewport (the table is server-rendered text and stays outside).
 */
export function WasteGroupBars({
  title,
  titleClassName,
  option,
  palette,
  heights,
  table,
  children,
}: Readonly<WasteGroupBarsProps>) {
  return (
    <>
      <h3
        className={`mb-2 text-base font-semibold leading-snug text-fg sm:text-lg ${titleClassName}`}
      >
        {title}
      </h3>
      <div
        style={
          { '--bars-h': `${heights.narrow}px`, '--bars-h-sm': `${heights.wide}px` } as CSSProperties
        }
      >
        <RenderWhenVisible variant="bars" rows={table.rows.length}>
          <LazyBarEChart option={option} palette={palette} rows={table.rows.length} />
        </RenderWhenVisible>
      </div>
      <WasteSharesTable {...table} />
      {children}
    </>
  );
}
