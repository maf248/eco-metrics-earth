'use client';

import { useMemo, useState } from 'react';

import { ChartPanel } from '@/components/charts/ChartPanel';
import { DataAttribution } from '@/components/DataAttribution';
import { MeasureToggle } from '@/components/MeasureToggle';
import { OriginCredit } from '@/components/OriginCredit';
import { YearDataTable } from '@/components/YearDataTable';
import { formatAnomaly } from '@/lib/formatNumber';
import { anomalyBaselineLabel, buildOceanSstAnomalyOption } from '@/lib/oceanSstAnomalyChartOption';
import type { ApiResponseMeta, OceanSstAnomalyData } from '@eco-metrics/shared';

interface OceanSstAnomalySectionProps {
  data: { data: OceanSstAnomalyData; meta: ApiResponseMeta };
}

/**
 * The annual sea surface temperature anomaly of one region at a time. Selection is component
 * state only (no URL, history or storage) and nothing is fetched on interaction: every region
 * arrived with the page. The chart sits below the fold, so it mounts when it scrolls into view.
 */
export function OceanSstAnomalySection({ data: { data, meta } }: OceanSstAnomalySectionProps) {
  const { regions, baseline, unit, startYear, endYear, origin } = data;
  const [code, setCode] = useState(regions[0].code);
  const region = regions.find((entry) => entry.code === code) ?? regions[0];
  const average = `${baseline.startYear}–${baseline.endYear}`;
  const option = useMemo(() => buildOceanSstAnomalyOption(region, data), [region, data]);

  return (
    <>
      <p className="text-sm text-fg-secondary">
        How far each year&rsquo;s average sea surface temperature is from the {average} average, the
        pre-industrial reference period of this dataset. The shaded band is the 95% uncertainty
        range of the estimate.
      </p>

      <div className="mt-4">
        <MeasureToggle
          legend="Region"
          options={regions.map(({ code: value, name }) => ({ value, label: name }))}
          value={region.code}
          onChange={setCode}
        />
      </div>

      <ChartPanel
        title={`${region.name}: annual sea surface temperature anomaly (${unit}, relative to the ${average} average)`}
        option={option}
        announcement={`Showing the annual sea surface temperature anomaly for ${region.name}`}
        deferred
      />

      <DataAttribution
        testId="ocean-sst-anomaly-attribution"
        meta={meta}
        extra={<OriginCredit origin={origin} testId="ocean-sst-anomaly-origin" />}
      />

      <YearDataTable
        caption={`${region.name}: annual sea surface temperature anomaly relative to the ${anomalyBaselineLabel(data)}, ${startYear}–${endYear}, with 95% uncertainty bounds`}
        entityName={`sea surface temperature anomaly for ${region.name}`}
        startYear={startYear}
        endYear={endYear}
        columns={[
          { header: `Mean (${unit} vs ${average})`, values: region.mean, format: formatAnomaly },
          { header: 'Lower bound (95%)', values: region.lower, format: formatAnomaly },
          { header: 'Upper bound (95%)', values: region.upper, format: formatAnomaly },
        ]}
      />
    </>
  );
}
