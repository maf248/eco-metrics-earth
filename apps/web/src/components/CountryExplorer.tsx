'use client';

import { useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { CountryCombobox } from '@/components/CountryCombobox';
import type { CountryOption } from '@/components/CountryCombobox';
import { WORLD_ENTITY_CODE } from '@eco-metrics/shared';
import type { CountryEntity } from '@eco-metrics/shared';

interface CountryExplorerProps<T extends CountryEntity> {
  heading: string;
  entities: T[];
  /** Extra controls on the same row as the country selector (for example a measure toggle). */
  controls?: ReactNode;
  /** Renders the chart, attribution and table of the selected entity. */
  children: (entity: T) => ReactNode;
}

/**
 * Chart-scoped explorer shell: owns which entity is selected (World by default)
 * and the card layout. Selection is component state only (no URL, history or
 * storage) and nothing is fetched on interaction: the whole dataset arrived
 * with the page. Everything with a chart or a table in it is supplied by the
 * caller.
 */
export function CountryExplorer<T extends CountryEntity>({
  heading,
  entities,
  controls,
  children,
}: CountryExplorerProps<T>) {
  const headingId = `${useId()}-heading`;
  const [code, setCode] = useState<string>(WORLD_ENTITY_CODE);

  const options = useMemo<CountryOption[]>(
    () => entities.map(({ code: entityCode, name, iso2 }) => ({ code: entityCode, name, iso2 })),
    [entities],
  );
  // `entities[0]` is safe: the payload guards (`isYearAlignedCountryData`) reject an empty list.
  const entity = entities.find((candidate) => candidate.code === code) ?? entities[0];

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border border-line-strong bg-surface-raised p-4 sm:p-6"
    >
      <h2 id={headingId} className="mb-4 text-xl font-semibold text-fg">
        {heading}
      </h2>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <CountryCombobox label="Country" options={options} value={code} onChange={setCode} />
        {controls}
      </div>

      {children(entity)}
    </section>
  );
}
