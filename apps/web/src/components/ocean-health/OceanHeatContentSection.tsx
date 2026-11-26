'use client';

import { useMemo, useState } from 'react';

import { ChartPanel } from '@/components/charts/ChartPanel';
import { DataAttribution } from '@/components/DataAttribution';
import { MeasureToggle } from '@/components/MeasureToggle';
import { OriginCredit } from '@/components/OriginCredit';
import { YearDataTable } from '@/components/YearDataTable';
import { formatHeatContent } from '@/lib/formatNumber';
import {
  buildOceanHeatOption,
  describeSources,
  orderedSources,
  sourceSpan,
} from '@/lib/oceanHeatChartOption';
import type { ApiResponseMeta, OceanHeatContentData } from '@eco-metrics/shared';

interface OceanHeatContentSectionProps {
  data: { data: OceanHeatContentData; meta: ApiResponseMeta };
}

/**
 * Ocean heat content of the World down to one depth at a time, with every source overlaid.
 * Selection is component state only and nothing is fetched on interaction: both depths arrived
 * with the page. The chart sits below the fold, so it mounts when it scrolls into view; it
 * remounts when the depth changes because the depths do not have the same sources.
 */
export function OceanHeatContentSection({ data: { data, meta } }: OceanHeatContentSectionProps) {
  const { depths, unit, startYear, endYear, origins } = data;
  const [depthId, setDepthId] = useState(depths[0].id);
  const depth = depths.find((entry) => entry.id === depthId) ?? depths[0];
  const option = useMemo(() => buildOceanHeatOption(depth, data), [depth, data]);

  const columns = orderedSources(depth.sources).map((source) => {
    const span = sourceSpan(source, startYear);
    return {
      header: span ? `${source.name}, ${span.from}–${span.to}` : `${source.name}, no data`,
      values: source.values,
      format: formatHeatContent,
    };
  });

  return (
    <>
      <p className="text-sm text-fg-secondary">
        How much heat the world&rsquo;s oceans have stored, in {unit} (ten thousand billion billion
        joules), down to {depth.label.replace('–', ' to ')}. Each line is one research group&rsquo;s
        estimate: {describeSources(depth.sources)}.
      </p>
      <p className="mt-2 text-sm text-fg-secondary" data-testid="ocean-heat-caveat">
        Each source covers a different period and uses its own reference period, so compare the
        shape and the trend of the lines, not their level.
      </p>

      <div className="mt-4">
        <MeasureToggle
          legend="Depth"
          options={depths.map(({ id, label }) => ({ value: id, label }))}
          value={depth.id}
          onChange={setDepthId}
        />
      </div>

      <ChartPanel
        title={`World: ocean heat content, ${depth.label} (${unit})`}
        option={option}
        announcement={`Showing ocean heat content for ${depth.label}`}
        deferred
        chartKey={depth.id}
      />

      <DataAttribution
        testId="ocean-heat-attribution"
        meta={meta}
        extra={
          <>
            {origins.map((origin, index) => (
              <span key={origin.title}>
                <OriginCredit origin={origin} testId={`ocean-heat-origin-${index}`} />{' '}
              </span>
            ))}
          </>
        }
      />

      <YearDataTable
        caption={`World: ocean heat content, ${depth.label}, in ${unit}, ${startYear}–${endYear}; each source covers its own span and uses its own reference period`}
        entityName={`ocean heat content, ${depth.label}`}
        startYear={startYear}
        endYear={endYear}
        columns={columns}
        wide
      />
    </>
  );
}
