import type { ReactNode } from 'react';

import { FOCUS_RING_CLASS_NAME } from '@/lib/cardClassNames';

type SortOrder = 'ascending' | 'descending';

interface SortHeaderProps {
  /** Whether the table is currently sorted by this column. */
  active: boolean;
  /** The table's current order (shown only when the column is active). */
  order: SortOrder;
  /** Called with the order to sort this column by when the header is pressed. */
  onSort: (order: SortOrder) => void;
  /** Layout classes of the `<th>` (padding). */
  className: string;
  /** The visible content of the header button. */
  children: ReactNode;
}

const ORDER_LABELS: Record<SortOrder, string> = {
  descending: 'highest first',
  ascending: 'lowest first',
};

function SortArrow({ order }: Readonly<{ order: SortOrder }>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`size-3.5 shrink-0 transition-transform motion-reduce:transition-none sm:size-4 ${order === 'ascending' ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3v10M4 9l4 4 4-4" />
    </svg>
  );
}

/**
 * A sortable column header. The active column shows its order in accent and `aria-sort`; pressing
 * it reverses the order, pressing another column sorts by it, highest first. The accessible name
 * starts with the visible text (WCAG 2.5.3) and then says the order and what a press does.
 */
export function SortHeader({
  active,
  order,
  onSort,
  className,
  children,
}: Readonly<SortHeaderProps>) {
  const next: SortOrder = active && order === 'descending' ? 'ascending' : 'descending';
  const state = active ? `, ${ORDER_LABELS[order]}` : '';

  return (
    <th scope="col" aria-sort={active ? order : undefined} className={className}>
      <button
        type="button"
        onClick={() => onSort(next)}
        className={`ml-auto inline-flex min-h-11 items-center gap-1 rounded-md text-right leading-tight ${FOCUS_RING_CLASS_NAME} ${active ? 'text-accent hover:text-accent-hover' : 'text-fg hover:text-accent'}`}
      >
        {children}
        <span className="sr-only">{`${state}. Sort ${ORDER_LABELS[next]}`}</span>
        <span className={active ? '' : 'opacity-40'}>
          <SortArrow order={active ? order : 'descending'} />
        </span>
      </button>
    </th>
  );
}
