'use client';

import { useMemo } from 'react';

import { LazyPieEChart } from '@/components/charts/LazyPieEChart';
import { RenderWhenVisible } from '@/components/charts/RenderWhenVisible';
import { buildEnergyDonutOption } from '@/lib/energyChartOption';
import { latestYear } from '@/lib/energyMix';
import type { EnergySourcesData, EnergySourcesEntity } from '@eco-metrics/shared';

interface EnergyDonutProps {
  entity: EnergySourcesEntity;
  data: Pick<EnergySourcesData, 'startYear'>;
}

/**
 * Donut of the selected entity's mix in its own latest year (no year selector).
 * Below the fold, so it renders when it scrolls into view; the pie code loads
 * only then.
 */
export function EnergyDonut({ entity, data: { startYear } }: EnergyDonutProps) {
  const year = latestYear(entity, startYear);
  const option = useMemo(
    () => (year === undefined ? undefined : buildEnergyDonutOption(entity, year, startYear)),
    [entity, year, startYear],
  );
  if (option === undefined) {
    return null;
  }
  const title = `${entity.name}: electricity mix in ${year}`;

  return (
    <section data-testid="energy-donut">
      <h3 className="mb-2 mt-8 text-base font-semibold leading-snug text-fg sm:text-lg">{title}</h3>
      <RenderWhenVisible>
        <LazyPieEChart option={option} palette="energyMix" />
      </RenderWhenVisible>
      <p role="status" className="sr-only">
        Showing the electricity mix of {entity.name} in {year}
      </p>
    </section>
  );
}
