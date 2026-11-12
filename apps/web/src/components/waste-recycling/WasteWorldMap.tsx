'use client';

import { useCallback, useState } from 'react';

import { ChoroplethMap } from '@/components/charts/ChoroplethMap';
import { MapLegend } from '@/components/charts/MapLegend';
import { RenderWhenVisible } from '@/components/charts/RenderWhenVisible';
import { MeasureToggle } from '@/components/MeasureToggle';
import { CARD_CLASS_NAME } from '@/lib/cardClassNames';
import { buildWasteMapOption } from '@/lib/wasteMapOption';
import {
  DEFAULT_WASTE_MEASURE,
  measureDefinition,
  readMeasure,
  WASTE_MEASURES,
  type WasteMeasure,
  type WasteSort,
} from '@/lib/wasteMeasures';
import type { WorldRegion } from '@/lib/worldGeometry';
import type { WasteCountry } from '@eco-metrics/shared';

import { WasteCountryTable } from './WasteCountryTable';

interface WasteWorldMapProps {
  countries: readonly WasteCountry[];
}

/**
 * A world map of one waste measure with its legend and the country table, which shares the
 * selected country with the map. State lives here only (no URL).
 */
export function WasteWorldMap({ countries }: Readonly<WasteWorldMapProps>) {
  const [measure, setMeasure] = useState<WasteMeasure>(DEFAULT_WASTE_MEASURE);
  const [sort, setSort] = useState<WasteSort>({
    measure: DEFAULT_WASTE_MEASURE,
    order: 'descending',
  });
  // Only countries with a value for the map measure can be selected, and a measure change ends a
  // selection without one, so it is always one of the colored countries.
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const { title, classLabels, legendLabel, ramp } = measureDefinition(measure);

  const changeMeasure = (next: WasteMeasure): void => {
    setMeasure(next);
    setSort({ measure: next, order: 'descending' });
    const selected = countries.find(({ code }) => code === selectedCode);
    if (selected && readMeasure(selected, next).value === null) {
      setSelectedCode(null);
    }
  };

  const toggle = useCallback((code: string) => {
    setSelectedCode((current) => (current === code ? null : code));
  }, []);

  const buildOption = useCallback(
    (regions: readonly WorldRegion[]) =>
      buildWasteMapOption({ regions, countries, measure, selectedCode }),
    [countries, measure, selectedCode],
  );

  return (
    <section aria-labelledby="waste-world-map-title" className={`mt-8 ${CARD_CLASS_NAME}`}>
      <h2
        id="waste-world-map-title"
        className="text-base font-semibold leading-snug text-fg sm:text-lg"
      >
        {title}
      </h2>
      <div className="mt-3">
        <MeasureToggle
          legend="Measure shown on the map"
          options={WASTE_MEASURES.map(({ value, label, shortLabel }) => ({
            value,
            label,
            shortLabel,
          }))}
          value={measure}
          onChange={changeMeasure}
          grid
        />
      </div>
      <div className="mt-3">
        <RenderWhenVisible variant="map">
          <ChoroplethMap buildOption={buildOption} onRegionClick={toggle} ramp={ramp} />
        </RenderWhenVisible>
      </div>
      <MapLegend classLabels={classLabels} label={legendLabel} ramp={ramp} />
      <p role="status" className="sr-only">
        {`Showing ${title}`}
      </p>
      <WasteCountryTable
        countries={countries}
        mapMeasure={measure}
        sort={sort}
        onSortChange={setSort}
        selectedCode={selectedCode}
        onSelect={toggle}
      />
    </section>
  );
}
