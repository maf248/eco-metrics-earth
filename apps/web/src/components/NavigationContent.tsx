'use client';

import { usePathname } from 'next/navigation';
import { Activity, ViewTransition, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { CategoryDataSkeleton } from '@/components/CategoryDataSkeleton';
import { CATEGORY_PAGE_CLASS_NAME, CategoryHeader } from '@/components/CategoryHeader';
import { usePendingNavigation } from '@/components/PendingNavigation';
import { categoryFromHref } from '@/lib/categoryFromHref';
import { CATEGORY_SKELETONS } from '@/lib/categorySkeletons';
import { normalise } from '@/lib/path';

/** How long a navigation may take before it earns a progress bar. */
const PROGRESS_DELAY_MS = 200;

function NavigationProgress({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    const timer = setTimeout(() => setVisible(true), PROGRESS_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setVisible(false);
    };
  }, [active]);

  if (!visible) {
    return null;
  }
  return (
    <div
      data-testid="navigation-progress"
      aria-hidden="true"
      className="navigation-progress fixed top-0 right-0 left-0 z-[60] h-0.5 bg-accent-solid"
    />
  );
}

/**
 * The only `<main>` of the site, which stays mounted so its height keeps the footer in place.
 * While a category is pending, its header and skeletons stand in for the page until it arrives.
 * The `div` is what the crossfade animates; `Activity` stops the hidden page's effects, so no
 * chart starts in a page that measures nothing.
 */
export function NavigationContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { pendingHref } = usePendingNavigation();

  const isLeaving = pendingHref !== null && normalise(pendingHref) !== normalise(pathname);
  const category = isLeaving ? categoryFromHref(pendingHref) : undefined;

  const mainRef = useRef<HTMLElement>(null);

  // The pending view is a new page to the visitor: it opens at the top, not when the route lands,
  // and a link focused inside the page that hides hands the focus to `<main>`, not to `<body>`.
  useLayoutEffect(() => {
    if (!category) {
      return;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (mainRef.current?.contains(document.activeElement)) {
      mainRef.current.focus({ preventScroll: true });
    }
  }, [category]);

  return (
    <>
      <NavigationProgress active={isLeaving} />
      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        aria-busy={category && CATEGORY_SKELETONS[category] ? true : undefined}
        className="isolate min-h-screen"
      >
        {category && (
          <div data-testid="pending-category" className={CATEGORY_PAGE_CLASS_NAME}>
            <CategoryHeader category={category} />
            <CategoryDataSkeleton category={category} />
          </div>
        )}
        <ViewTransition>
          <div hidden={Boolean(category)}>
            <Activity mode={category ? 'hidden' : 'visible'}>{children}</Activity>
          </div>
        </ViewTransition>
      </main>
    </>
  );
}
