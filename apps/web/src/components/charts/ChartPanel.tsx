'use client';

import type { EChartsCoreOption } from 'echarts/core';

import type { ChartPalette } from '@/components/charts/chartTokens';
import { LazyEChart } from '@/components/charts/LazyEChart';
import { RenderWhenVisible } from '@/components/charts/RenderWhenVisible';

interface ChartPanelProps {
  /** Visible title above the chart: names the entity, the quantity and any baseline. */
  title: string;
  option: EChartsCoreOption;
  /** Spoken (polite live region) when the selection changes; not shown. */
  announcement: string;
  /** Series colours; the categorical palette when omitted. */
  palette?: ChartPalette;
  /**
   * Mounts the chart only when it scrolls into view (a same-height skeleton until then), for a
   * chart below the fold. The title and the announcement are always rendered.
   */
  deferred?: boolean;
  /**
   * Remounts the chart when it changes. A chart whose series set changes (not just their data)
   * needs it: ECharts merges a new option into the old one, so a series the new option no longer
   * has would stay on the chart.
   */
  chartKey?: string;
}

/** A chart with its title and a visually hidden announcement of what it shows. */
export function ChartPanel({
  title,
  option,
  announcement,
  palette,
  deferred = false,
  chartKey,
}: ChartPanelProps) {
  const chart = <LazyEChart key={chartKey} option={option} palette={palette} />;

  return (
    <>
      <h3 className="mb-2 mt-6 text-base font-semibold leading-snug text-fg sm:text-lg">{title}</h3>
      {deferred ? <RenderWhenVisible>{chart}</RenderWhenVisible> : chart}

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
