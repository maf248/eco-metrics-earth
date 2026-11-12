import type { ReactNode, ToggleEvent } from 'react';

import { FOCUS_RING_CLASS_NAME } from '@/lib/cardClassNames';

interface DataTableDisclosureProps {
  /**
   * Said after "View data table" to tell apart several tables of one page that share the visible
   * text; omit it when the page has a single table.
   */
  srLabel?: string;
  /** Called when the disclosure opens or closes (for example to reveal a selected row). */
  onToggle?: (event: ToggleEvent<HTMLDetailsElement>) => void;
  children: ReactNode;
}

/** The collapsed "View data table" disclosure every data table of the site sits in. */
export function DataTableDisclosure({
  srLabel,
  onToggle,
  children,
}: Readonly<DataTableDisclosureProps>) {
  return (
    <details className="group mt-4 border-t border-line-subtle pt-2" onToggle={onToggle}>
      <summary
        className={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-1 font-medium text-accent hover:text-accent-hover ${FOCUS_RING_CLASS_NAME} [&::-webkit-details-marker]:hidden`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 4l6 6-6 6" />
        </svg>
        View data table
        {srLabel && <span className="sr-only">{`: ${srLabel}`}</span>}
      </summary>
      {children}
    </details>
  );
}
