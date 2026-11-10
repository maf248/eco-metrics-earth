import Link from 'next/link';

import { SiteLogoIcon } from '@/components/icons';

import BrandText from './BrandText';

/**
 * Mobile-only fixed top header providing site identity and a home link.
 *
 * Visible only below the `lg` breakpoint — desktop uses the sidebar brand.
 * Hidden via `lg:hidden` (CSS only, not removed from DOM).
 *
 * Accessibility:
 *  - `<header>` provides the `banner` landmark (role="banner" implicit)
 *  - The `<Link>` aria-label gives screen readers a clean announcement
 *    ("eco-metrics earth — go to home") without reading decorative elements
 *  - Logo and BrandText internals are all aria-hidden
 *
 * Animation: delegated to <BrandText /> (typewriter + cursor + [↵]).
 *
 * Layout contract:
 *  - Height: h-header (h-14 / 56px plus the top safe area). Pages use pt-header to clear it.
 *  - z-index: z-50 — above page content, consistent with the bottom nav z-index.
 */
export default function MobileHeader() {
  return (
    <header
      aria-label="Site header"
      className={[
        // Visibility: mobile only
        'lg:hidden',
        // Position: fixed top, full width, above content
        'site-header fixed top-0 left-0 right-0 z-50 h-header pt-safe px-safe',
        // Style: dark background with subtle blur + bottom border
        'bg-surface/95 backdrop-blur-sm border-b border-line',
      ].join(' ')}
    >
      <Link
        href="/"
        aria-label="eco-metrics earth — go to home"
        className={[
          'flex items-center h-full gap-3 px-4',
          'hover:bg-hover transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        ].join(' ')}
      >
        {/* Site logo — decorative, described by the link aria-label */}
        <SiteLogoIcon aria-hidden className="w-7 h-7 shrink-0 drop-shadow-icon-xs" />

        {/* Animated terminal brand text + cursor + [↵] */}
        <BrandText />
      </Link>
    </header>
  );
}
