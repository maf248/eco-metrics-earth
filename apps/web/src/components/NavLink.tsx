'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type React from 'react';

interface NavLinkProps {
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}

/**
 * Normalise a path by removing trailing slashes.
 * The `|| '/'` guard prevents the root `/` from becoming an empty string.
 */
const normalise = (p: string): string => p.replace(/\/$/, '') || '/';

export default function NavLink({ href, icon: Icon, label }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = normalise(href) === normalise(pathname);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={[
        // Mobile: fixed-width column, equal spacing regardless of label length
        'flex flex-col items-center justify-start w-20 h-full gap-1 pt-3 pb-1 px-1 lg:h-auto',
        // Desktop: horizontal row, fixed height
        'lg:w-full lg:flex-row lg:justify-start lg:gap-3 lg:px-5 lg:py-3 lg:rounded-lg',
        // Typography
        'text-[10px] lg:text-sm font-medium leading-tight transition-colors duration-150',
        // Colour + background: active vs inactive
        isActive
          ? 'text-emerald-400 lg:bg-white/5'
          : 'text-gray-400 hover:text-white hover:bg-white/5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-gray-950',
      ].join(' ')}
    >
      <span
        data-testid="nav-icon"
        className={[
          'w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg p-1',
          isActive ? 'bg-white/15' : 'bg-white/10',
        ].join(' ')}
      >
        <Icon aria-hidden className="w-6 h-6" />
      </span>
      <span className="w-full text-center whitespace-normal break-words leading-tight lg:truncate lg:max-w-none lg:text-left lg:whitespace-nowrap">
        {label}
      </span>
    </Link>
  );
}
