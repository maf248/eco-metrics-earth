'use client';

import { useId, useMemo } from 'react';
import type { ReactNode } from 'react';

import { LazyEChart } from '@/components/charts/LazyEChart';
import { RenderWhenVisible } from '@/components/charts/RenderWhenVisible';
import { YearDataTable } from '@/components/YearDataTable';
import { CARD_CLASS_NAME } from '@/lib/cardClassNames';
import { formatAnomaly } from '@/lib/formatNumber';
import { buildGlobalSeriesChartOption, PARIS_LIMIT_CELSIUS } from '@/lib/globalSeriesChartOption';
import type { GlobalTemperatureGlobal } from '@eco-metrics/shared';

interface GlobalTemperatureLongRunProps {
  global: GlobalTemperatureGlobal;
  unit: string;
  /** Rendered directly under the chart (the "Data:" attribution), from the server. */
  attribution?: ReactNode;
}

/**
 * The World's temperature since 1850 against the pre-industrial baseline, with
 * its 95% confidence band. It has no selector: one series, one chart. The chart
 * sits below the fold, so it mounts (and requests the ECharts chunk) only when
 * it scrolls into view; its text equivalent is a collapsed table.
 */
export function GlobalTemperatureLongRun({
  global,
  unit,
  attribution,
}: GlobalTemperatureLongRunProps) {
  const headingId = `${useId()}-heading`;
  const { startYear, endYear, baseline } = global;
  const period = `${baseline.startYear}–${baseline.endYear}`;
  const option = useMemo(() => buildGlobalSeriesChartOption(global, unit), [global, unit]);

  return (
    <section aria-labelledby={headingId} className={`mt-8 ${CARD_CLASS_NAME}`}>
      <h2 id={headingId} className="mb-4 text-xl font-semibold text-fg">
        Global temperature since {startYear}, relative to {period}
      </h2>
      <p className="text-sm text-fg-secondary">
        The world&apos;s average surface temperature compared with the {period} average, the
        reference period commonly used for pre-industrial times. The shaded band is the 95%
        confidence range.
      </p>

      <h3 className="mb-2 mt-6 text-base font-semibold leading-snug text-fg sm:text-lg">
        World: annual temperature anomaly ({unit}, relative to the {period} pre-industrial average)
      </h3>
      <RenderWhenVisible>
        <LazyEChart option={option} />
      </RenderWhenVisible>

      {attribution}

      <p className="mt-3 text-sm text-fg-muted" data-testid="global-temperature-paris-note">
        The {PARIS_LIMIT_CELSIUS} {unit} line refers to the long-term average over decades, so a
        single year above {PARIS_LIMIT_CELSIUS} {unit} does not by itself mean the limit has been
        breached.
      </p>

      <YearDataTable
        caption={`World: annual temperature anomaly relative to ${period}, ${startYear}–${endYear}, with 95% confidence bounds`}
        entityName={`World since ${startYear}`}
        startYear={startYear}
        endYear={endYear}
        columns={[
          { header: `Mean (${unit} vs ${period})`, values: global.mean, format: formatAnomaly },
          { header: 'Lower bound (95%)', values: global.lower, format: formatAnomaly },
          { header: 'Upper bound (95%)', values: global.upper, format: formatAnomaly },
        ]}
      />
    </section>
  );
}
