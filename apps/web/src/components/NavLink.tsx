'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  icon: string;
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
      <span
        data-testid="nav-icon"
        className={[
          'w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg p-1',
          isActive ? 'bg-white/15' : 'bg-white/8',
        ].join(' ')}
      >
        <Image src={icon} alt="" width={20} height={20} aria-hidden />
      </span>
      <span className="truncate max-w-full lg:max-w-none">{label}</span>
    </Link>
  );
}
