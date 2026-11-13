'use client';

import { useMemo, useState } from 'react';

import { LazyEChart } from '@/components/charts/LazyEChart';
import { RenderWhenVisible } from '@/components/charts/RenderWhenVisible';
import { CountryCombobox, type CountryOption } from '@/components/CountryCombobox';
import { DataTableDisclosure } from '@/components/DataTableDisclosure';
import { ScrollRegion } from '@/components/ScrollRegion';
import { CARD_CLASS_NAME } from '@/lib/cardClassNames';
import {
  buildProjectionOption,
  formatProjected,
  PROJECTION_YEARS,
  projectionTonnes,
  projectionUnit,
} from '@/lib/wasteChartOption';
import type { WasteCountry, WasteWorldGeneration } from '@eco-metrics/shared';

interface WasteProjectionChartProps {
  world: WasteWorldGeneration;
  countries: readonly WasteCountry[];
}

const WORLD_CODE = 'WORLD';
const WORLD_NAME = 'World';

/** Municipal waste generated in 2022, 2030, 2040 and 2050 for the world or a chosen country. */
export function WasteProjectionChart({ world, countries }: Readonly<WasteProjectionChartProps>) {
  const [code, setCode] = useState(WORLD_CODE);

  const options = useMemo<CountryOption[]>(
    () => [
      { code: WORLD_CODE, name: WORLD_NAME, iso2: null },
      ...countries.map(({ code: value, name, iso2 }) => ({ code: value, name, iso2 })),
    ],
    [countries],
  );
  const country = countries.find((item) => item.code === code);
  const name = country?.name ?? WORLD_NAME;
  const generation = country?.generation ?? world;
  const { tonnes, unit, option } = useMemo(() => {
    const values = projectionTonnes(generation);
    const chosenUnit = projectionUnit(Math.max(...values));
    return {
      tonnes: values,
      unit: chosenUnit,
      option: buildProjectionOption(name, generation, chosenUnit),
    };
  }, [name, generation]);

  return (
    <section aria-labelledby="waste-projection-title" className={`mt-8 ${CARD_CLASS_NAME}`}>
      <h2 id="waste-projection-title" className="text-xl font-semibold text-fg">
        Projected waste generation
      </h2>
      <p className="mt-1 text-sm text-fg-secondary">
        2022 is the World Bank&rsquo;s estimate; 2030, 2040 and 2050 are World Bank projections.
      </p>
      <div className="mt-4">
        <CountryCombobox
          options={options}
          value={code}
          onChange={setCode}
          label="Country or world"
        />
      </div>
      <h3 className="mb-2 mt-6 text-base font-semibold leading-snug text-fg sm:text-lg">
        {`${name}: municipal waste generated (${unit.label})`}
      </h3>
      <RenderWhenVisible variant="series">
        <LazyEChart option={option} />
      </RenderWhenVisible>
      <p role="status" className="sr-only">
        {`Showing projected waste generation for ${name}`}
      </p>
      <DataTableDisclosure srLabel="projected waste generation">
        <ScrollRegion label={`Projected waste generation for ${name}`} className="mt-2">
          <table className="w-full min-w-72 border-separate border-spacing-0 text-sm tabular-nums">
            <caption className="px-3 py-2 text-left font-medium text-fg">
              {`${name}: municipal waste generated`}
            </caption>
            <thead className="bg-surface-card">
              <tr className="text-fg *:border-b *:border-line-strong">
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  Year
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  {`Waste (${unit.label})`}
                </th>
              </tr>
            </thead>
            <tbody className="text-fg-body">
              {PROJECTION_YEARS.map((year, index) => (
                <tr key={year} className="*:border-b *:border-line-subtle">
                  <th scope="row" className="px-3 py-1.5 text-left font-medium text-fg">
                    {year === 2022 ? year : `${year} (projection)`}
                  </th>
                  <td className="px-3 py-1.5 text-right">{formatProjected(tonnes[index], unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      </DataTableDisclosure>
    </section>
  );
}
