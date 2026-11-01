'use client';

import React from 'react';
import type { ComponentType, SVGProps } from 'react';

import { NavigationLink } from '@/components/NavigationLink';

interface NavLinkProps {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  isActive: boolean;
}

function NavLink({ href, icon: Icon, label, isActive }: NavLinkProps) {
  return (
    <NavigationLink
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={[
        // Mobile: fixed-width column, equal spacing regardless of label length
        'flex flex-col items-center justify-start w-20 h-full gap-1 pt-3 pb-1 px-1 lg:h-auto',
        // Desktop: horizontal row, fixed height
        'lg:w-full lg:flex-row lg:justify-start lg:gap-3 lg:px-5 lg:py-2 lg:rounded-lg',
        // Typography
        'text-[10px] lg:text-sm font-medium leading-tight transition-colors duration-150',
        // Colour + background: active vs inactive
        isActive
          ? 'text-accent lg:bg-hover'
          : 'text-fg-secondary hover:text-fg-strong hover:bg-hover',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset',
      ].join(' ')}
    >
      <span
        data-testid="nav-icon"
        className={[
          'w-8 h-8 shrink-0 flex items-center justify-center rounded-lg p-1',
          isActive ? 'bg-well-active' : 'bg-well',
        ].join(' ')}
      >
        <Icon aria-hidden className="w-6 h-6 drop-shadow-icon-sm" />
      </span>
      <span className="w-full text-center whitespace-normal wrap-break-word leading-tight lg:truncate lg:max-w-none lg:text-left lg:whitespace-nowrap">
        {label}
      </span>
    </NavigationLink>
  );
}

export default React.memo(NavLink);
