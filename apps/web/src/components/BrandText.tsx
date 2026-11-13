'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const BRAND_TEXT = '~ eco-metrics.earth';
const TYPING_INTERVAL_MS = 60;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const prefersReducedMotion = (): boolean => window.matchMedia(REDUCED_MOTION_QUERY).matches;
/** The server cannot know the preference: it renders the animated start, like the first paint. */
const prefersReducedMotionOnServer = (): boolean => false;

/**
 * Terminal-style brand text of the mobile header and the desktop sidebar: '~ eco-metrics.earth'
 * types itself in, then a blinking cursor and a [↵] affordance (it fades in once typing ends)
 * signal that the parent link is interactive. With reduced motion the full text shows at once.
 *
 * Every span is aria-hidden: the parent link names itself with aria-label.
 */
export default function BrandText() {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    prefersReducedMotion,
    prefersReducedMotionOnServer,
  );
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    let charIndex = 0;
    const interval = setInterval(() => {
      charIndex += 1;
      setTypedText(BRAND_TEXT.slice(0, charIndex));
      if (charIndex >= BRAND_TEXT.length) {
        clearInterval(interval);
      }
    }, TYPING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  const displayedText = reducedMotion ? BRAND_TEXT : typedText;
  const isTypingDone = displayedText === BRAND_TEXT;

  return (
    <>
      {/* Brand text — typewriter reveal */}
      <span
        aria-hidden="true"
        className="font-mono text-sm font-medium text-accent tracking-tight whitespace-nowrap"
      >
        {displayedText}
      </span>

      {/* Blinking cursor — always visible */}
      <span
        aria-hidden="true"
        className="animate-cursor-blink font-mono text-sm font-medium text-accent leading-none select-none -ml-2"
      >
        ▋
      </span>

      {/* [↵] affordance — fades in after typing completes */}
      <span
        aria-hidden="true"
        className={[
          'font-mono text-sm font-medium text-accent select-none',
          'transition-opacity duration-500 motion-reduce:transition-none',
          isTypingDone ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        [↵]
      </span>
    </>
  );
}
