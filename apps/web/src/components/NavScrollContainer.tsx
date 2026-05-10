'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface NavScrollContainerProps {
  children: ReactNode;
}

/**
 * Scrollable container for the mobile bottom nav.
 *
 * - Renders a <ul> with horizontal scroll on mobile, vertical on desktop.
 * - Shows a left gradient affordance when there is hidden content to the left.
 * - Shows a right gradient affordance when there is hidden content to the right.
 * - Gradients are aria-hidden and pointer-events-none — purely decorative.
 * - On desktop (lg+) the gradients are hidden via lg:hidden.
 */
export default function NavScrollContainer({ children }: NavScrollContainerProps) {
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });

    // Re-check on resize (e.g. orientation change, window resize)
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  return (
    // Wrapper: flex item that fills remaining nav space on mobile;
    // acts as the clipping + positioning context for the gradients.
    <div className="relative flex flex-row lg:flex-col flex-1 lg:flex-none overflow-hidden lg:overflow-visible">
      {/* Left scroll affordance */}
      {canScrollLeft && (
        <div
          aria-hidden="true"
          className="lg:hidden absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none bg-gradient-to-r from-black to-transparent"
        />
      )}

      {/* Right scroll affordance */}
      {canScrollRight && (
        <div
          aria-hidden="true"
          className="lg:hidden absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none bg-gradient-to-l from-black to-transparent"
        />
      )}

      {/* VoiceOver/Safari strips list semantics from styled lists when CSS removes bullets — explicit role restores them. */}
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <ul
        ref={scrollRef}
        role="list"
        aria-label="Navigation items"
        className="flex flex-row lg:flex-col flex-1 overflow-x-auto lg:overflow-x-visible overflow-y-visible lg:overflow-y-auto lg:py-2"
      >
        {children}
      </ul>
    </div>
  );
}
