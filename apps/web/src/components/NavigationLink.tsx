'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

import { preloadEChart } from '@/components/charts/LazyEChart';
import { preloadPieEChart } from '@/components/charts/LazyPieEChart';
import { usePendingNavigation } from '@/components/PendingNavigation';
import { categoryFromHref } from '@/lib/categoryFromHref';
import { CATEGORY_SKELETONS } from '@/lib/categorySkeletons';

// The handlers below own these events, and `navigate` always pushes with the default scroll.
type OwnedLinkProps = 'href' | 'onFocus' | 'onNavigate' | 'onPointerEnter' | 'replace' | 'scroll';
type NavigationLinkProps = Omit<ComponentProps<typeof Link>, OwnedLinkProps> & { href: string };

/** Starts downloading the chart code as soon as the user aims at a page that draws one. */
function preloadChartsOf(href: string): void {
  const category = categoryFromHref(href);
  const blocks = category ? (CATEGORY_SKELETONS[category] ?? []) : [];
  for (const block of blocks) {
    if (block.kind === 'explorer') {
      preloadEChart();
      if (block.hasDonut) {
        preloadPieEChart();
      }
    }
  }
}

/**
 * A `Link` whose client navigation runs through `PendingNavigationProvider`, so the destination
 * is known before its route arrives. Modified clicks keep the browser's behavior.
 */
export function NavigationLink({ href, ...props }: NavigationLinkProps) {
  const { navigate } = usePendingNavigation();

  return (
    <Link
      {...props}
      href={href}
      onPointerEnter={() => preloadChartsOf(href)}
      onFocus={() => preloadChartsOf(href)}
      onNavigate={(event) => {
        event.preventDefault();
        preloadChartsOf(href);
        navigate(href);
      }}
    />
  );
}
