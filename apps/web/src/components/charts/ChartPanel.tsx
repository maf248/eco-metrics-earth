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
  /** A chart below the page's first chart: mounts when it scrolls into view (chart rule 5). */
  deferred?: boolean;
}

/** A chart with its title and a visually hidden announcement of what it shows. */
export function ChartPanel({
  title,
  option,
  announcement,
  palette,
  deferred = false,
}: ChartPanelProps) {
  const chart = <LazyEChart option={option} palette={palette} />;

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
