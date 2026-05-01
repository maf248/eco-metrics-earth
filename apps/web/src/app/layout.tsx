import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import Navbar from '@/components/Navbar';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'eco-metrics earth',
    template: '%s — eco-metrics earth',
  },
  description: 'Track and visualize environmental metrics for a sustainable planet.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white">
        {/*
         * Skip-to-content link — visually hidden until focused via keyboard.
         * Essential for keyboard and screen-reader users to bypass the nav.
         */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-md focus:font-medium focus:outline-none"
        >
          Skip to main content
        </a>
        <Navbar />
        {/*
         * Content offset:
         *  - Mobile/tablet: pb-16 to clear the fixed bottom nav
         *  - Desktop:       lg:pl-64 to clear the fixed left sidebar
         */}
        <div id="main-content" tabIndex={-1} className="pb-16 lg:pb-0 lg:pl-64">
          {children}
        </div>
      </body>
    </html>
  );
}
