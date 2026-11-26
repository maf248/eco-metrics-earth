'use client';

import { useMemo } from 'react';

import { ChartPanel } from '@/components/charts/ChartPanel';
import { buildOceanSeaLevelOption } from '@/lib/oceanSeaLevelChartOption';
import type { OceanSeaLevelData } from '@eco-metrics/shared';

interface OceanSeaLevelChartProps {
  data: OceanSeaLevelData;
}

/**
 * The sea level chart, one line per mission. A client component because the option carries
 * formatter functions, which cannot cross from a server component; it sits below the fold, so it
 * mounts when it scrolls into view.
 */
export function OceanSeaLevelChart({ data }: OceanSeaLevelChartProps) {
  const option = useMemo(() => buildOceanSeaLevelOption(data), [data]);

  return (
    <ChartPanel
      title={`Global mean sea level anomaly by satellite mission (${data.unit})`}
      option={option}
      announcement="Showing global mean sea level for every satellite mission"
      deferred
    />
  );
}
