'use client';

import { useMemo } from 'react';

import { LazyEChart } from '@/components/charts/LazyEChart';
import { buildOceanSstDailyOption } from '@/lib/oceanSstDailyChartOption';
import type { OceanSstDailyData } from '@eco-metrics/shared';

interface OceanSstDailyChartProps {
  data: OceanSstDailyData;
}

/**
 * The daily overlay chart and its title. It is the first chart of the page, so it is not
 * deferred: it starts its chunk at once. A client component because the option carries
 * formatter functions, which cannot cross from a server component.
 */
export function OceanSstDailyChart({ data }: OceanSstDailyChartProps) {
  const option = useMemo(() => buildOceanSstDailyOption(data), [data]);

  return (
    <>
      <h3 className="mb-2 mt-6 text-base font-semibold leading-snug text-fg sm:text-lg">
        Daily sea surface temperature, {data.coverage} ({data.unit})
      </h3>
      <LazyEChart option={option} />
    </>
  );
}
