'use client';

import type { EChartsCoreOption } from 'echarts/core';
import type { ReactNode } from 'react';

import type { ChartPalette } from '@/components/charts/chartTokens';
import { LazyColumnEChart } from '@/components/charts/LazyColumnEChart';
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
  /** Subtitle under the title: what the chart shows and how to read it (caveats, axis). */
  description?: ReactNode;
  /** `columns` draws vertical bars (registers the bar chart); lines and areas otherwise. */
  kind?: 'line' | 'columns';
}

/** A chart with its title and a visually hidden announcement of what it shows. */
export function ChartPanel({
  title,
  option,
  announcement,
  palette,
  deferred = false,
  chartKey,
  kind = 'line',
  description,
}: ChartPanelProps) {
  const Chart = kind === 'columns' ? LazyColumnEChart : LazyEChart;
  const chart = <Chart key={chartKey} option={option} palette={palette} />;

  return (
    <>
      <h3 className="mb-2 mt-6 text-base font-semibold leading-snug text-fg sm:text-lg">{title}</h3>
      {description ? <p className="mb-2 text-sm text-fg-secondary">{description}</p> : null}
      {deferred ? <RenderWhenVisible>{chart}</RenderWhenVisible> : chart}

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
