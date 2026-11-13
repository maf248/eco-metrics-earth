import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { Footer } from '@/components/Footer';
import MobileHeader from '@/components/MobileHeader';
import Navbar from '@/components/Navbar';
import { NavigationContent } from '@/components/NavigationContent';
import { PendingNavigationProvider } from '@/components/PendingNavigation';
import ThemeProvider from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';
import { siteUrl } from '@/lib/siteUrl';
import { SITE_DESCRIPTION, buildOpenGraph, buildTwitter } from '@/lib/socialMetadata';

import './globals.css';

export const viewport: Viewport = {
  // Draw under the system bars (gesture bar, home indicator, notch): the fixed chrome pads
  // itself by the safe-area insets (globals.css), so no strip of another color shows below it.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'eco-metrics earth',
    template: '%s | eco-metrics earth',
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: '/icons/eco-metrics-earth.svg',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: buildOpenGraph(),
  twitter: buildTwitter(),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-surface px-safe text-fg">
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
          <PendingNavigationProvider>
            {/*
             * Skip-to-content link — visually hidden until focused via keyboard.
             * Essential for keyboard and screen-reader users to bypass the nav.
             */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent-solid-strong focus:text-on-accent focus:rounded-md focus:font-medium focus:outline-none"
            >
              Skip to main content
            </a>
            {/*
             * Mobile-only top header (h-header: h-14 / 56px plus the top safe area) — site brand + home link.
             * Hidden on desktop (lg:hidden) where the sidebar brand covers this.
             * Dependency: page content uses pt-header to clear this fixed header.
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
             *  - Mobile top:    pt-header on each page clears the MobileHeader
             *  - Mobile bottom: pb-bottom-nav clears the fixed bottom nav (h-20 + bottom safe area)
             *  - Desktop left:  lg:pl-76 clears the fixed left sidebar (w-76)
             */}
            <div className="pb-bottom-nav lg:pb-safe lg:pl-76">
              <NavigationContent>{children}</NavigationContent>
              <Footer />
            </div>
          </PendingNavigationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
