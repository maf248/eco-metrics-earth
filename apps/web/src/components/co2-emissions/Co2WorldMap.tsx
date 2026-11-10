'use client';

import { useCallback, useDeferredValue, useMemo, useState } from 'react';

import { ChoroplethMap } from '@/components/charts/ChoroplethMap';
import { MapLegend } from '@/components/charts/MapLegend';
import { RenderWhenVisible } from '@/components/charts/RenderWhenVisible';
import { Co2RankingTable } from '@/components/co2-emissions/Co2RankingTable';
import { YearSlider } from '@/components/YearSlider';
import { CARD_CLASS_NAME } from '@/lib/cardClassNames';
import { buildCo2MapOption, CO2_MAP_CLASS_LABELS } from '@/lib/co2MapOption';
import { DEFAULT_RANKING_SORT, rankCo2Countries, type RankingSort } from '@/lib/co2Ranking';
import type { WorldRegion } from '@/lib/worldGeometry';
import type { Co2EmissionsData } from '@eco-metrics/shared';

interface Co2WorldMapProps {
  data: Co2EmissionsData;
}

/** Title of the map card (the skeleton in `CATEGORY_SKELETONS` draws a sample of it). */
export function co2WorldMapTitle(year: number): string {
  return `CO2 emissions per capita, ${year} (tonnes per person)`;
}

/**
 * Countries compared in one year: a world map of CO2 emissions per capita, its year slider and
 * legend, and the ranking table below. One year for both, the latest by default; selecting a
 * country on either one highlights it on the other. State lives here only (no URL).
 */
export function Co2WorldMap({ data }: Co2WorldMapProps) {
  const [year, setYear] = useState(data.endYear);
  const [sort, setSort] = useState<RankingSort>(DEFAULT_RANKING_SORT);
  // Only countries with a value can be selected (on the map or in the table), and a year change
  // ends a selection without a value in that year, so it is always one of the colored countries.
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // The table (about 200 rows with flags) follows the slider at low priority, so dragging it
  // recolors the map first.
  const tableYear = useDeferredValue(year);
  const rows = useMemo(() => rankCo2Countries(data, tableYear, sort), [data, tableYear, sort]);

  const changeYear = (next: number): void => {
    setYear(next);
    const selected = data.entities.find(({ code }) => code === selectedCode);
    if (selected && (selected.perCapita[next - data.startYear] ?? null) === null) {
      setSelectedCode(null);
    }
  };

  const toggle = useCallback((code: string) => {
    setSelectedCode((current) => (current === code ? null : code));
  }, []);

  const buildOption = useCallback(
    (regions: readonly WorldRegion[]) => buildCo2MapOption({ regions, data, year, selectedCode }),
    [data, year, selectedCode],
  );

  return (
    <section aria-labelledby="co2-world-map-title" className={`mt-8 ${CARD_CLASS_NAME}`}>
      <h2
        id="co2-world-map-title"
        className="text-base font-semibold leading-snug text-fg sm:text-lg"
      >
        {co2WorldMapTitle(year)}
      </h2>
      <YearSlider
        min={data.startYear}
        max={data.endYear}
        value={year}
        onChange={changeYear}
        label="Year shown on the map and in the ranking"
      />
      <div className="mt-2">
        {/* Below the explorer's chart, so it loads when it scrolls into view (chart rule 5). */}
        <RenderWhenVisible variant="map">
          <ChoroplethMap buildOption={buildOption} onRegionClick={toggle} />
        </RenderWhenVisible>
      </div>
      <MapLegend classLabels={CO2_MAP_CLASS_LABELS} label="Legend: tonnes of CO2 per person" />
      <p role="status" className="sr-only">
        {`Showing CO2 emissions per capita in ${year}`}
      </p>
      <Co2RankingTable
        rows={rows}
        year={tableYear}
        sort={sort}
        onSortChange={setSort}
        selectedCode={selectedCode}
        onSelect={toggle}
      />
    </section>
  );
}
