'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface NavLinkProps {
  href: string;
  icon: ReactNode;
  label: string;
}

export default function NavLink({ href, icon, label }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={[
        // Mobile: stacked column, full equal flex share
        'flex flex-col items-center justify-center flex-1 gap-0.5 py-2 px-1',
        // Desktop: horizontal row, fixed height
        'lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:px-5 lg:py-3 lg:w-full',
        // Typography
        'text-[10px] lg:text-sm font-medium leading-tight transition-colors duration-150',
        // Colour: active vs inactive
        isActive
          ? 'text-emerald-400'
          : 'text-gray-400 hover:text-white hover:bg-white/5 lg:rounded-lg',
      ].join(' ')}
    >
      <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">{icon}</span>
      <span className="truncate max-w-full lg:max-w-none">{label}</span>
    </Link>
  );
}
