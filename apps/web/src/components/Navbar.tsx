import Image from 'next/image';

import { SITE_LOGO_ICON } from '@/lib/categoryIcon';
import { NAV_ITEMS } from '@/lib/navItems';

import NavLink from './NavLink';

/**
 * Main site navigation.
 *
 * Layout behaviour (single <nav> element, CSS-driven):
 *  - Mobile / tablet (< lg): fixed bottom bar, horizontal, icon + label
 *  - Desktop (lg+):           fixed left sidebar, vertical, icon + label
 *
 * SEO / Accessibility:
 *  - Semantic <nav> landmark with aria-label
 *  - Active link receives aria-current="page" (via NavLink)
 *  - All icons are aria-hidden; labels are always visible text
 */
export default function Navbar() {
  return (
    <nav
      aria-label="Main navigation"
      className={[
        'fixed z-50',
        // Mobile / tablet: bottom bar
        'bottom-0 left-0 right-0 h-16',
        'flex flex-row',
        'border-t border-gray-800',
        // Desktop: left sidebar
        'lg:top-0 lg:right-auto lg:bottom-auto',
        'lg:h-screen lg:w-64',
        'lg:flex-col',
        'lg:border-t-0 lg:border-r lg:border-gray-800',
        // Background
        'bg-gray-900',
      ].join(' ')}
    >
      {/* Brand — desktop sidebar only */}
      <div className="hidden lg:flex items-center h-16 px-5 gap-2.5 border-b border-gray-800 flex-shrink-0">
        <Image
          src={SITE_LOGO_ICON}
          alt="eco-metrics earth logo"
          width={28}
          height={28}
          className="flex-shrink-0"
        />
        <span className="text-emerald-400 font-semibold tracking-tight text-sm">
          eco-metrics earth
        </span>
      </div>

      {/* Navigation links */}
      <div className="flex flex-row lg:flex-col flex-1 lg:flex-none overflow-x-auto lg:overflow-x-visible overflow-y-visible lg:overflow-y-auto lg:py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.slug} href={item.href} icon={item.icon} label={item.label} />
        ))}
      </div>
    </nav>
  );
}
