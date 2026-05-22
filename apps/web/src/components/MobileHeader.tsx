'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { SiteLogoIcon } from '@/components/icons';

const BRAND_TEXT = '~ eco-metrics.earth';
const TYPING_INTERVAL_MS = 60;

/**
 * Returns true if the user prefers reduced motion.
 * Safe to call on client only — returns false on SSR.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Mobile-only fixed top header providing site identity and a home link.
 *
 * Visible only below the `lg` breakpoint — desktop uses the sidebar brand.
 * Hidden via `lg:hidden` (CSS only, not removed from DOM).
 *
 * Accessibility:
 *  - `<header>` provides the `banner` landmark (role="banner" implicit)
 *  - The `<Link>` aria-label gives screen readers a clean announcement
 *    ("eco-metrics earth — go to home") without reading decorative elements
 *  - Logo, brand text, cursor, and [↵] are all aria-hidden
 *
 * Animation:
 *  - Typewriter effect: characters revealed one by one at 60ms intervals
 *  - [↵] fades in after typing completes to signal interactivity
 *  - Cursor `▋` blinks continuously via CSS (globals.css `animate-cursor-blink`)
 *  - All animations skip instantly when prefers-reduced-motion: reduce is set
 *
 * Layout contract:
 *  - Height: h-14 (56px). All <main> elements must use pt-14 to clear this header.
 *  - z-index: z-50 — above page content, consistent with the bottom nav z-index.
 */
export default function MobileHeader() {
  // Lazy initialisers run only once on first render (client-side).
  // On SSR, prefersReducedMotion() returns false — safe for hydration.
  const [displayedText, setDisplayedText] = useState<string>(() =>
    prefersReducedMotion() ? BRAND_TEXT : '',
  );
  const [isTypingDone, setIsTypingDone] = useState<boolean>(() => prefersReducedMotion());

  useEffect(() => {
    // Typewriter is skipped when initial state is already complete.
    if (isTypingDone) return;

    let charIndex = 0;
    const interval = setInterval(() => {
      charIndex += 1;
      setDisplayedText(BRAND_TEXT.slice(0, charIndex));
      if (charIndex >= BRAND_TEXT.length) {
        clearInterval(interval);
        setIsTypingDone(true);
      }
    }, TYPING_INTERVAL_MS);

    return () => clearInterval(interval);

    // isTypingDone intentionally omitted: used only as a one-time gate on mount.
  }, []);

  return (
    <header
      aria-label="Site header"
      className={[
        // Visibility: mobile only
        'lg:hidden',
        // Position: fixed top, full width, above content
        'fixed top-0 left-0 right-0 z-50 h-14',
        // Style: dark background with subtle blur + bottom border
        'bg-black/95 backdrop-blur-sm border-b border-gray-800',
      ].join(' ')}
    >
      <Link
        href="/"
        aria-label="eco-metrics earth — go to home"
        className={[
          // Fill the full header height — makes entire bar tappable
          'flex items-center h-full gap-3 px-4',
          // Hover state matching the nav palette
          'hover:bg-white/5 transition-colors duration-150',
          // Focus ring consistent with NavLink
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        ].join(' ')}
      >
        {/* Site logo — decorative, described by the link aria-label */}
        <SiteLogoIcon aria-hidden className="w-7 h-7 flex-shrink-0" />

        {/* Brand text — typewriter reveal, terminal / CLI aesthetic */}
        <span
          aria-hidden="true"
          className="font-mono text-sm font-medium text-emerald-400 tracking-tight"
        >
          {displayedText}
        </span>

        {/* Blinking cursor — always visible, decorative */}
        <span
          aria-hidden="true"
          className="animate-cursor-blink font-mono text-sm font-medium text-emerald-400 leading-none select-none -ml-2"
        >
          ▋
        </span>

        {/* [↵] affordance — fades in after typing completes */}
        <span
          aria-hidden="true"
          className={[
            'font-mono text-sm font-medium text-emerald-400/60 select-none',
            'transition-opacity duration-500',
            isTypingDone ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          [↵]
        </span>
      </Link>
    </header>
  );
}
