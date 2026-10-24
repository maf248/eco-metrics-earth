'use client';

import { useId, useMemo, useState } from 'react';

import { SourceAttribution } from '@/components/SourceAttribution';
import { LINK_CLASS_NAME } from '@/lib/linkClassName';
import { formatLiters, formatWaterFootprintEquivalents } from '@/lib/waterFootprintEquivalents';
import type {
  DataSourcePublisher,
  WaterFootprintCategory,
  WaterFootprintProduct,
} from '@eco-metrics/shared';
import { waterFootprintCategorySlugMap, waterFootprintWaterTypeLabels } from '@eco-metrics/shared';

type SortKey = 'name' | 'footprint';
type SortDirection = 'asc' | 'desc';

interface WaterFootprintTableProps {
  products: WaterFootprintProduct[];
}

const CATEGORIES = Object.values(waterFootprintCategorySlugMap);

function sortDescription(key: SortKey, direction: SortDirection): string {
  if (key === 'footprint') {
    return direction === 'asc' ? 'water footprint (low to high)' : 'water footprint (high to low)';
  }
  return direction === 'asc' ? 'name (A to Z)' : 'name (Z to A)';
}

function filterDescription(filter: 'all' | WaterFootprintCategory): string {
  return filter === 'all' ? 'All categories' : filter;
}

export function WaterFootprintTable({ products }: WaterFootprintTableProps) {
  const [filter, setFilter] = useState<'all' | WaterFootprintCategory>('all');
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'footprint',
    direction: 'desc',
  });

  const groupId = useId();
  const statusId = useId();

  const visibleRows = useMemo(() => {
    const filtered =
      filter === 'all' ? products : products.filter((product) => product.category === filter);

    const sorted = [...filtered].sort((a, b) => {
      if (sort.key === 'name') {
        const comparison = a.product.localeCompare(b.product);
        return sort.direction === 'asc' ? comparison : -comparison;
      }

      if (a.waterFootprintLiters === null && b.waterFootprintLiters === null) {
        return 0;
      }
      if (a.waterFootprintLiters === null) {
        return 1;
      }
      if (b.waterFootprintLiters === null) {
        return -1;
      }

      const comparison = a.waterFootprintLiters - b.waterFootprintLiters;
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [products, filter, sort]);

  const handleSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const statusText = `Showing ${visibleRows.length} of ${products.length} products — ${filterDescription(
    filter,
  )}, sorted by ${sortDescription(sort.key, sort.direction)}`;

  return (
    <div className="w-full max-w-6xl">
      <fieldset className="mb-6">
        <legend className="sr-only">Filter by category</legend>
        <div className="flex flex-wrap gap-2">
          {(['all', ...CATEGORIES] as const).map((category) => {
            const inputId = `${groupId}-${category}`;
            const label = category === 'all' ? 'All' : category;
            return (
              <div key={category}>
                <input
                  id={inputId}
                  type="radio"
                  name={groupId}
                  value={category}
                  checked={filter === category}
                  onChange={() => setFilter(category)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={inputId}
                  className="cursor-pointer rounded-full border border-line-control bg-surface-raised px-3 py-1 text-sm text-fg-control transition-colors peer-checked:border-accent-solid-strong peer-checked:bg-accent-solid-strong peer-checked:text-on-accent hover:bg-chip-hover peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-focus-offset"
                >
                  {label}
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <p id={statusId} role="status" aria-live="polite" className="sr-only">
        {statusText}
      </p>
      <p className="mb-4 text-sm text-fg-secondary" aria-hidden="true">
        {statusText}
      </p>

      {visibleRows.length === 0 ? (
        <p className="text-fg-body">No products match the selected filter.</p>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto" data-testid="water-footprint-table">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Water footprint by product</caption>
              <thead>
                <tr className="border-b border-line-strong">
                  <SortHeader
                    label="Product"
                    active={sort.key === 'name'}
                    direction={sort.key === 'name' ? sort.direction : 'asc'}
                    onClick={() => handleSort('name')}
                  />
                  <th scope="col" className="py-2 pr-4 font-semibold text-fg">
                    Category
                  </th>
                  <SortHeader
                    label="Water footprint"
                    active={sort.key === 'footprint'}
                    direction={sort.key === 'footprint' ? sort.direction : 'asc'}
                    onClick={() => handleSort('footprint')}
                  />
                  <th scope="col" className="py-2 pr-4 font-semibold text-fg">
                    Water type
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-fg">
                    Contextual equivalent
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-fg">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((product) => (
                  <tr key={product.product} className="border-b border-line-subtle">
                    <th scope="row" className="py-2 pr-4 font-medium text-fg">
                      {product.product}
                    </th>
                    <td className="py-2 pr-4 text-fg-body">{product.category}</td>
                    <td className="py-2 pr-4 text-fg-body">
                      {product.waterFootprintLiters === null ? (
                        'No data'
                      ) : (
                        <>
                          {formatLiters(product.waterFootprintLiters)} L{' '}
                          <span className="text-fg-muted">{product.unit}</span>
                        </>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-fg-body">
                      {waterFootprintWaterTypeLabels[product.waterType]}
                    </td>
                    <td className="py-2 pr-4 text-fg-body">
                      {formatWaterFootprintEquivalents(product.waterFootprintLiters)}
                    </td>
                    <td className="py-2 pr-4 text-fg-body">
                      <Attribution
                        source={product.source}
                        sourceUrl={product.sourceUrl}
                        methodology={product.methodology}
                        publisher={product.publisher}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="lg:hidden space-y-4" data-testid="water-footprint-cards">
            {visibleRows.map((product) => (
              <li
                key={product.product}
                className="rounded-lg border border-line-strong bg-surface-raised p-4"
              >
                <p className="font-semibold text-fg">
                  <strong>{product.product}</strong>
                </p>
                <p className="text-sm text-fg-body">{product.category}</p>
                <p className="text-sm text-fg-body">
                  {product.waterFootprintLiters === null ? (
                    'No data'
                  ) : (
                    <>
                      {formatLiters(product.waterFootprintLiters)} L{' '}
                      <span className="text-fg-muted">{product.unit}</span>
                    </>
                  )}
                </p>
                <p className="text-sm text-fg-body">
                  {waterFootprintWaterTypeLabels[product.waterType]}
                </p>
                <p className="text-sm text-fg-body">
                  {formatWaterFootprintEquivalents(product.waterFootprintLiters)}
                </p>
                <div className="mt-2 text-sm">
                  <Attribution
                    source={product.source}
                    sourceUrl={product.sourceUrl}
                    methodology={product.methodology}
                    publisher={product.publisher}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

interface SortHeaderProps {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}

function SortHeader({ label, active, direction, onClick }: SortHeaderProps) {
  return (
    <th
      scope="col"
      aria-sort={active ? sortDirectionToAria(direction) : undefined}
      className="py-2 pr-4 font-semibold text-fg"
    >
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 underline-offset-2 hover:underline"
      >
        {label}
        <span aria-hidden="true">{active ? (direction === 'asc' ? ' ▲' : ' ▼') : ''}</span>
      </button>
    </th>
  );
}

function sortDirectionToAria(direction: SortDirection): 'ascending' | 'descending' {
  return direction === 'asc' ? 'ascending' : 'descending';
}

interface AttributionProps {
  source: string;
  sourceUrl: string;
  methodology?: string;
  publisher?: DataSourcePublisher;
}

function Attribution({ source, sourceUrl, methodology, publisher }: AttributionProps) {
  return (
    <>
      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className={LINK_CLASS_NAME}>
        {source}
      </a>
      {publisher && (
        <span className="block text-fg-secondary">
          via <SourceAttribution source={publisher} />
        </span>
      )}
      {methodology && (
        <details className="mt-1">
          <summary className="cursor-pointer text-fg-secondary">Methodology</summary>
          <p className="mt-1 text-fg-body">{methodology}</p>
        </details>
      )}
    </>
  );
}

WaterFootprintTable.displayName = 'WaterFootprintTable';
