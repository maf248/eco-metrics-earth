import type { ReactNode, Ref } from 'react';

import { TABLE_REGION_CLASS_NAME } from '@/lib/cardClassNames';

interface ScrollRegionProps {
  /** Names the region for assistive technology; ", scrollable" is added. */
  label: string;
  /** Layout classes of the region (margin, maximum height); it always scrolls. */
  className?: string;
  testId?: string;
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
}

/** The bordered, keyboard-focusable scroll region a data table sits in. */
export function ScrollRegion({
  label,
  className = '',
  testId,
  ref,
  children,
}: Readonly<ScrollRegionProps>) {
  return (
    <div
      role="region"
      aria-label={`${label}, scrollable`}
      // Focusable so the region can be scrolled by keyboard.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      ref={ref}
      data-testid={testId}
      className={`${className} overflow-auto ${TABLE_REGION_CLASS_NAME}`}
    >
      {children}
    </div>
  );
}
