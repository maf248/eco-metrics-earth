import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import MobileHeader from '@/components/MobileHeader';
import Navbar from '@/components/Navbar';
import ThemeProvider from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-white dark:bg-black text-gray-900 dark:text-white">
        {/*
         * Blocking script — runs synchronously before paint.
         * SSR defaults to dark mode; this script only removes the `dark`
         * class when the user explicitly prefers light mode, so dark-mode
         * users see zero flash.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('eco-metrics-theme');
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <ThemeProvider>
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
          {/*
           * Mobile-only top header (h-14 / 56px) — site brand + home link.
           * Hidden on desktop (lg:hidden) where the sidebar brand covers this.
           * Dependency: <main> elements use pt-14 to clear this fixed header.
           */}
          <MobileHeader />
          {/*
           * Bottom nav / sidebar (Navbar handles both breakpoints internally).
           */}
          <Navbar />
          {/*
           * Theme toggle — fixed top-right lamp button.
           */}
          <ThemeToggle />
          {/*
           * Content offset — three fixed UI zones:
           *  - Mobile top:    pt-14 on each <main> clears the MobileHeader
           *  - Mobile bottom: pb-20 clears the fixed bottom nav (h-20)
           *  - Desktop left:  lg:pl-76 clears the fixed left sidebar (w-76)
           */}
          <div className="pb-20 lg:pb-0 lg:pl-76">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
