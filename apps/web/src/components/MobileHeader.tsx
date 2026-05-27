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
 *  - Height: h-14 (56px). All <main> elements must use pt-14 to clear this header.
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
        'fixed top-0 left-0 right-0 z-50 h-14',
        // Style: dark background with subtle blur + bottom border
        'bg-white/95 dark:bg-black/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800',
      ].join(' ')}
    >
      <Link
        href="/"
        aria-label="eco-metrics earth — go to home"
        className={[
          'flex items-center h-full gap-3 px-4',
          'hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black',
        ].join(' ')}
      >
        {/* Site logo — decorative, described by the link aria-label */}
        <SiteLogoIcon
          aria-hidden
          className="w-7 h-7 flex-shrink-0 drop-shadow-[0_0_2px_rgba(0,0,0,0.15)] dark:drop-shadow-none"
        />

        {/* Animated terminal brand text + cursor + [↵] */}
        <BrandText />
      </Link>
    </header>
  );
}
