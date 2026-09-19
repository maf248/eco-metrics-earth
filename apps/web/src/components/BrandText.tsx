'use client';

import { useEffect, useState } from 'react';

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
 * Terminal-style animated brand text used in both MobileHeader and the
 * desktop Navbar sidebar brand.
 *
 * Renders '~ eco-metrics.earth' with a typewriter reveal on mount,
 * followed by a blinking cursor (▋) and a [↵] affordance that fades in
 * after typing completes to signal the element is interactive.
 *
 * Accessibility: all spans are aria-hidden — the parent link provides
 * the accessible name via aria-label.
 *
 * Animation:
 *  - Characters revealed at 60ms intervals via setInterval
 *  - Cursor blinks via CSS class (animate-cursor-blink in globals.css)
 *  - [↵] fades in with transition-opacity duration-500
 *  - prefers-reduced-motion: full text shown immediately, no animation
 */
export default function BrandText() {
  const [displayedText, setDisplayedText] = useState<string>(() =>
    prefersReducedMotion() ? BRAND_TEXT : '',
  );
  const [isTypingDone, setIsTypingDone] = useState<boolean>(() => prefersReducedMotion());

  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Brand text — typewriter reveal */}
      <span
        aria-hidden="true"
        className="font-mono text-sm font-medium text-emerald-700 dark:text-emerald-400 tracking-tight whitespace-nowrap"
      >
        {displayedText}
      </span>

      {/* Blinking cursor — always visible */}
      <span
        aria-hidden="true"
        className="animate-cursor-blink font-mono text-sm font-medium text-emerald-700 dark:text-emerald-400 leading-none select-none -ml-2"
      >
        ▋
      </span>

      {/* [↵] affordance — fades in after typing completes */}
      <span
        aria-hidden="true"
        className={[
          'font-mono text-sm font-medium text-emerald-700/60 dark:text-emerald-400/60 select-none',
          'transition-opacity duration-500',
          isTypingDone ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        [↵]
      </span>
    </>
  );
}
