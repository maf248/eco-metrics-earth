'use client';

import type { EChartsCoreOption } from 'echarts/core';

import type { ChartPalette } from '@/components/charts/chartTokens';
import { LazyEChart } from '@/components/charts/LazyEChart';

interface ChartPanelProps {
  /** Visible title above the chart: names the entity, the quantity and any baseline. */
  title: string;
  option: EChartsCoreOption;
  /** Spoken (polite live region) when the selection changes; not shown. */
  announcement: string;
  /** Series colours; the categorical palette when omitted. */
  palette?: ChartPalette;
}

/** A chart with its title and a visually hidden announcement of what it shows. */
export function ChartPanel({ title, option, announcement, palette }: ChartPanelProps) {
  return (
    <>
      <h3 className="mb-2 mt-6 text-base font-semibold leading-snug text-fg sm:text-lg">{title}</h3>
      <LazyEChart option={option} palette={palette} />

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
