'use client';

import { useCallback, useMemo, useState } from 'react';

import { ChoroplethMap } from '@/components/charts/ChoroplethMap';
import { MapLegend } from '@/components/charts/MapLegend';
import { RenderWhenVisible } from '@/components/charts/RenderWhenVisible';
import { ForestRankingTable } from '@/components/deforestation/ForestRankingTable';
import { CARD_CLASS_NAME } from '@/lib/cardClassNames';
import {
  DEFAULT_FOREST_RANKING_SORT,
  rankForestCountries,
  type ForestRankingSort,
} from '@/lib/forestChange';
import {
  buildForestChangeMapOption,
  FOREST_CHANGE_CLASS_LABELS,
} from '@/lib/forestChangeMapOption';
import type { WorldRegion } from '@/lib/worldGeometry';
import type { ForestAreaData } from '@eco-metrics/shared';

interface ForestChangeSectionProps {
  data: ForestAreaData;
}

/** Title of the map inside the change card (the skeleton draws a sample of it). */
export function forestChangeMapTitle(startYear: number): string {
  return `Change in forest area since ${startYear}`;
}

/**
 * Countries compared on one map: the percentage change in forest area since the first year,
 * with its legend, and the ranking table below. A single comparison, so no year slider.
 * Selecting a country on either one highlights it on the other. State lives here only (no URL).
 */
export function ForestChangeSection({ data }: ForestChangeSectionProps) {
  const [sort, setSort] = useState<ForestRankingSort>(DEFAULT_FOREST_RANKING_SORT);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const ranking = useMemo(() => rankForestCountries(data, sort), [data, sort]);

  const toggle = useCallback((code: string) => {
    setSelectedCode((current) => (current === code ? null : code));
  }, []);

  const buildOption = useCallback(
    (regions: readonly WorldRegion[]) =>
      buildForestChangeMapOption({ regions, data, selectedCode }),
    [data, selectedCode],
  );

  return (
    <section aria-labelledby="forest-change-title" className={`mt-8 ${CARD_CLASS_NAME}`}>
      <h2 id="forest-change-title" className="mb-4 text-xl font-semibold text-fg">
        {`Forest change since ${data.startYear}`}
      </h2>
      <h3 className="text-base font-semibold leading-snug text-fg sm:text-lg">
        {forestChangeMapTitle(data.startYear)}
      </h3>
      <div className="mt-2">
        {/* Below the explorer's chart, so it loads when it scrolls into view (chart rule 5). */}
        <RenderWhenVisible variant="map">
          <ChoroplethMap buildOption={buildOption} onRegionClick={toggle} ramp="divergent" />
        </RenderWhenVisible>
      </div>
      <MapLegend
        classLabels={FOREST_CHANGE_CLASS_LABELS}
        label={`Legend: percentage change in forest area since ${data.startYear}`}
        ramp="divergent"
      />
      <p className="sr-only">
        {`Showing the change in forest area between ${data.startYear} and ${data.endYear}`}
      </p>
      <ForestRankingTable
        rows={ranking.rows}
        unrankedByPercent={ranking.unrankedByPercent}
        startYear={data.startYear}
        endYear={data.endYear}
        sort={sort}
        onSortChange={setSort}
        selectedCode={selectedCode}
        onSelect={toggle}
      />
    </section>
  );
}
