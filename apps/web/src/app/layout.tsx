import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import Navbar from '@/components/Navbar';

import './globals.css';

export const metadata: Metadata = {
  title: 'eco-metrics earth',
  description: 'Track and visualize environmental metrics for a sustainable planet.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-white">
        <Navbar />
        {/*
         * Content offset:
         *  - Mobile/tablet: pb-16 to clear the fixed bottom nav
         *  - Desktop:       lg:pl-64 to clear the fixed left sidebar
         */}
        <div className="pb-16 lg:pb-0 lg:pl-64">{children}</div>
      </body>
    </html>
  );
}
