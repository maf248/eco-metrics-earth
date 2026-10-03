'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface NavScrollContainerProps {
  children: ReactNode;
}

/**
 * Scrollable container for the mobile bottom nav / desktop sidebar nav list.
 *
 * - Renders a <ul> with horizontal scroll on mobile, vertical on desktop.
 * - Mobile: items use `items-stretch` so each <li> fills the full nav height,
 *   ensuring icons are always pinned to the same top edge regardless of label length.
 * - Shows a left gradient affordance (w-12) when there is hidden content to the left.
 * - Shows a right gradient affordance (w-12) when there is hidden content to the right.
 * - Desktop: the wrapper and <ul> are bounded (`flex-1 lg:min-h-0` / `lg:min-h-0`)
 *   so the `<ul>`'s `lg:overflow-y-auto` can scroll within the remaining sidebar height.
 * - Shows a top gradient affordance (h-12) when the list has scrolled down from its top.
 * - Shows a bottom gradient affordance (h-12) when there is more content below.
 * - Gradients fade from the nav surface colour so they blend with the bar.
 * - Gradients are aria-hidden and pointer-events-none — purely decorative.
 * - On desktop (lg+) the horizontal gradients are hidden via lg:hidden.
 * - On mobile/tablet the vertical gradients are hidden via hidden lg:block.
 */
export default function NavScrollContainer({ children }: NavScrollContainerProps) {
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
      setCanScrollUp(el.scrollTop > 0);
      setCanScrollDown(el.scrollTop < el.scrollHeight - el.clientHeight - 1);
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
    // Wrapper: flex item that fills remaining nav space (width on mobile, height
    // below the brand on desktop — min-h-0 keeps it bounded so the <ul> scrolls);
    // acts as the positioning context for the gradients.
    <div className="relative flex flex-row lg:flex-col flex-1 lg:min-h-0 overflow-hidden lg:overflow-visible">
      {/* Left scroll affordance */}
      {canScrollLeft && (
        <div
          aria-hidden="true"
          className="lg:hidden absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-linear-to-r from-nav-surface dark:from-nav-surface-dark to-transparent"
        />
      )}

      {/* Right scroll affordance */}
      {canScrollRight && (
        <div
          aria-hidden="true"
          className="lg:hidden absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-linear-to-l from-nav-surface dark:from-nav-surface-dark to-transparent"
        />
      )}

      {/* Top scroll affordance — desktop only */}
      {canScrollUp && (
        <div
          aria-hidden="true"
          className="hidden lg:block absolute left-0 right-0 top-0 h-12 z-10 pointer-events-none bg-linear-to-b from-nav-surface dark:from-nav-surface-dark to-transparent"
        />
      )}

      {/* Bottom scroll affordance — desktop only */}
      {canScrollDown && (
        <div
          aria-hidden="true"
          className="hidden lg:block absolute left-0 right-0 bottom-0 h-12 z-10 pointer-events-none bg-linear-to-t from-nav-surface dark:from-nav-surface-dark to-transparent"
        />
      )}

      {/* VoiceOver/Safari strips list semantics from styled lists when CSS removes bullets — explicit role restores them. */}
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <ul
        ref={scrollRef}
        role="list"
        aria-label="Navigation items"
        className="flex flex-row lg:flex-col flex-1 lg:min-h-0 overflow-x-auto lg:overflow-x-visible overflow-y-visible lg:overflow-y-auto lg:py-2 justify-evenly lg:justify-start items-stretch"
      >
        {children}
      </ul>
    </div>
  );
}
