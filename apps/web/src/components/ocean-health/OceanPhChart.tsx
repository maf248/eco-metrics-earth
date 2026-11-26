'use client';

import { useMemo } from 'react';

import { ChartPanel } from '@/components/charts/ChartPanel';
import { buildOceanPhOption } from '@/lib/oceanPhChartOption';
import type { OceanPhData } from '@eco-metrics/shared';

interface OceanPhChartProps {
  data: OceanPhData;
}

/**
 * The pH chart: monthly points and their rolling yearly average. A client component because the
 * option carries formatter functions, which cannot cross from a server component; it sits below
 * the fold, so it mounts when it scrolls into view.
 */
export function OceanPhChart({ data }: OceanPhChartProps) {
  const option = useMemo(() => buildOceanPhOption(data), [data]);

  return (
    <ChartPanel
      title={`Ocean ${data.unit} at ${data.station}: monthly measurements and rolling yearly average`}
      option={option}
      announcement={`Showing ocean ${data.unit} at ${data.station}`}
      deferred
    />
  );
}
