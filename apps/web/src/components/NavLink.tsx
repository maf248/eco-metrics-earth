'use client';

import Link from 'next/link';
import React from 'react';
import type { ComponentType, SVGProps } from 'react';

interface NavLinkProps {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  isActive: boolean;
}

function NavLink({ href, icon: Icon, label, isActive }: NavLinkProps) {
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
          ? 'text-emerald-700 lg:bg-gray-100 dark:text-emerald-400 dark:lg:bg-white/5'
          : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-gray-950',
      ].join(' ')}
    >
      <span
        data-testid="nav-icon"
        className={[
          'w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg p-1',
          isActive ? 'bg-gray-400 dark:bg-white/15' : 'bg-gray-300 dark:bg-white/10',
        ].join(' ')}
      >
        <Icon
          aria-hidden
          className="w-6 h-6 drop-shadow-[0_0_2px_rgba(0,0,0,0.18)] dark:drop-shadow-none"
        />
      </span>
      <span className="w-full text-center whitespace-normal break-words leading-tight lg:truncate lg:max-w-none lg:text-left lg:whitespace-nowrap">
        {label}
      </span>
    </Link>
  );
}

export default React.memo(NavLink);
