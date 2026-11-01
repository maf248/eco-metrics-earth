'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SiteLogoIcon } from '@/components/icons';
import { NAV_ITEMS } from '@/lib/navItems';
import { normalise } from '@/lib/path';

import BrandText from './BrandText';
import NavLink from './NavLink';
import NavScrollContainer from './NavScrollContainer';
import { usePendingNavigation } from './PendingNavigation';

/**
 * Main site navigation.
 *
 * Layout behaviour (single <nav> element, CSS-driven):
 *  - Mobile / tablet (< lg): fixed bottom bar, horizontal, icon + label
 *  - Desktop (lg+):           fixed left sidebar, vertical, icon + label
 *
 * SEO / Accessibility:
 *  - Semantic <nav> landmark with aria-label
 *  - <ul>/<li> list semantics — screen readers announce item count
 *  - Active link receives aria-current="page" (via NavLink)
 *  - All icons are aria-hidden; labels are always visible text
 *  - Skip-to-content link in layout.tsx bypasses this nav for keyboard users
 *  - Desktop brand link: aria-label matches MobileHeader for consistency
 */
export default function Navbar() {
  const pathname = usePathname();
  const { pendingHref } = usePendingNavigation();
  // The destination lights up at the click, before its route arrives.
  const activePath = pendingHref ?? pathname;

  return (
    <nav
      aria-label="Main navigation"
      className={[
        'site-nav fixed z-50',
        // Mobile / tablet: bottom bar
        'bottom-0 left-0 right-0 h-20',
        'flex flex-row',
        'border-t border-line',
        // Desktop: left sidebar
        'lg:top-0 lg:right-auto lg:bottom-auto',
        'lg:h-screen lg:w-76',
        'lg:flex-col',
        'lg:border-t-0 lg:border-r lg:border-line',
        // Background — opaque: page content scrolls behind the fixed nav
        'bg-nav-surface',
      ].join(' ')}
    >
      {/* Brand — desktop sidebar only, links to home */}
      <Link
        href="/"
        aria-label="eco-metrics earth — go to home"
        className="hidden lg:flex items-center h-16 px-5 gap-2.5 border-b border-line shrink-0 hover:bg-hover-subtle transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset"
      >
        <SiteLogoIcon aria-hidden className="w-7 h-7 shrink-0 drop-shadow-icon-sm" />
        <BrandText />
      </Link>

      {/* Navigation links — scroll container handles mobile gradients + ul/li semantics */}
      <NavScrollContainer>
        {NAV_ITEMS.map((item) => {
          const isActive = normalise(item.href) === normalise(activePath);
          return (
            <li
              key={item.slug}
              className="flex flex-none lg:flex-none w-20 lg:w-full h-full lg:h-auto"
            >
              <NavLink href={item.href} icon={item.icon} label={item.label} isActive={isActive} />
            </li>
          );
        })}
      </NavScrollContainer>
    </nav>
  );
}
