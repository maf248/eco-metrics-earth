import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import Navbar from '@/components/Navbar';
import { siteUrl } from '@/lib/siteUrl';

import './globals.css';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'eco-metrics earth',
    template: '%s — eco-metrics earth',
  },
  description: 'Track and visualize environmental metrics for a sustainable planet.',
  icons: {
    icon: '/icons/eco-metrics-earth.svg',
    apple: '/icons/eco-metrics-earth.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'eco-metrics earth',
    images: [
      {
        url: '/icons/eco-metrics-earth.svg',
        width: 512,
        height: 512,
        alt: 'eco-metrics earth logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    images: ['/icons/eco-metrics-earth.svg'],
  },
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
        <div className="pb-20 lg:pb-0 lg:pl-64">{children}</div>
      </body>
    </html>
  );
}
