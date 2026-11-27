'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { ChartPanel } from '@/components/charts/ChartPanel';
import { CountryExplorer } from '@/components/CountryExplorer';
import { YearDataTable, type YearDataColumn } from '@/components/YearDataTable';
import { formatWhole } from '@/lib/formatNumber';
import { buildTreeCoverLossOption, treeCoverLossTotal } from '@/lib/treeCoverLossChartOption';
import type { TreeCoverLossData, TreeCoverLossEntity } from '@eco-metrics/shared';

interface TreeCoverLossSectionProps {
  data: TreeCoverLossData;
  /** Rendered under the chart (the "Data:" attribution with the GFW credit), from the server. */
  attribution?: ReactNode;
}

const THOUSAND = 1_000;
const formatThousand = (value: number): string => formatWhole(value / THOUSAND);

const SUBTITLE =
  'Tree cover loss detected by satellite each year, by dominant cause, in million hectares. ' +
  'It is not the same as deforestation: loss from fires and logging is often followed by regrowth.';

const APPROXIMATION_NOTE =
  'Each cause is the dominant one for a patch of about 1 km, so the split is approximate. ' +
  'Detection methods improved between 2011 and 2015, which may make recent years look higher ' +
  'than earlier ones.';

const TABLE_NOTE = 'A dash means the source lists no loss for that cause.';

interface EntityProps {
  entity: TreeCoverLossEntity;
  data: TreeCoverLossData;
}

function TreeCoverLossChart({ entity, data }: EntityProps) {
  const option = useMemo(() => buildTreeCoverLossOption(entity, data), [entity, data]);

  return (
    <>
      <ChartPanel
        title={`${entity.name}: tree cover loss by cause (million hectares per year)`}
        description={SUBTITLE}
        option={option}
        kind="columns"
        palette="treeCoverLoss"
        deferred
        announcement={`Showing tree cover loss by cause for ${entity.name}`}
      />
      <p className="mt-2 text-sm text-fg-muted" data-testid="tree-cover-loss-note">
        {APPROXIMATION_NOTE}
      </p>
    </>
  );
}

/** One column per driver, in the payload's order, then the derived total. */
function TreeCoverLossTable({ entity, data }: EntityProps) {
  const { startYear, endYear, drivers } = data;
  const totals = Array.from({ length: endYear - startYear + 1 }, (_, index) =>
    treeCoverLossTotal(entity, drivers, index),
  );
  const columns: YearDataColumn[] = [
    ...drivers.map(({ id, name }) => ({
      header: name,
      values: entity[id],
      format: formatThousand,
    })),
    { header: 'Total', values: totals, format: formatThousand },
  ];

  return (
    <>
      <YearDataTable
        caption={`${entity.name}: tree cover loss by cause, ${startYear}–${endYear}, in thousand hectares`}
        entityName={`${entity.name} tree cover loss`}
        startYear={startYear}
        endYear={endYear}
        columns={columns}
        wide
      />
      <p className="mt-2 text-xs text-fg-muted" data-testid="tree-cover-loss-table-note">
        {TABLE_NOTE}
      </p>
    </>
  );
}

/**
 * Tree cover loss by cause for one entity (World by default), with its own selector, independent
 * of the forest area explorer. Component state only: nothing is fetched on interaction.
 */
export function TreeCoverLossSection({ data, attribution }: TreeCoverLossSectionProps) {
  return (
    <CountryExplorer heading="Tree cover loss by cause" entities={data.entities}>
      {(entity) => (
        <>
          <TreeCoverLossChart entity={entity} data={data} />
          {attribution}
          <TreeCoverLossTable entity={entity} data={data} />
        </>
      )}
    </CountryExplorer>
  );
}
