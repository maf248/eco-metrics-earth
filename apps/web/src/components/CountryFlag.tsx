'use client';

import 'flag-icons/css/flag-icons.min.css';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { GlobeIcon } from '@/components/GlobeIcon';

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 code (`XK` for Kosovo); `null` shows a globe instead of a flag. */
  iso2: string | null;
  /**
   * Render the flag only once it scrolls into view. Every rendered flag is a
   * separate image request, so long lists must not render them all at once.
   */
  lazy?: boolean;
}

// Fixed 4:3 box, so the layout is identical before and after the image loads. The ring keeps
// pale flags (Japan, Finland) visible on both surfaces.
const BOX_CLASS_NAME =
  'inline-block h-4 w-[1.3333rem] shrink-0 text-base overflow-hidden rounded-sm ring-1 ring-line-strong';

const subscribeNever = (): (() => void) => () => undefined;
const hasIntersectionObserver = (): boolean => typeof IntersectionObserver !== 'undefined';

/**
 * Decorative flag (the country name is always adjacent text), drawn with the
 * `flag-icons` stylesheet. Next bundles CSS per route, so the stylesheet loads on
 * every page of the route that renders this component; the SVGs themselves are
 * only fetched for flags that are rendered.
 */
export function CountryFlag({ iso2, lazy = false }: CountryFlagProps) {
  const ref = useRef<HTMLSpanElement>(null);
  // The server snapshot says "can observe", matching the first client render, so there is no
  // hydration mismatch; without IntersectionObserver the flag is revealed right after mount.
  const canObserve = useSyncExternalStore(subscribeNever, hasIntersectionObserver, () => true);
  const [revealed, setRevealed] = useState(!lazy);
  const visible = revealed || !canObserve;

  useEffect(() => {
    const element = ref.current;
    if (visible || !element) {
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setRevealed(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  if (iso2 === null) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-[1.3333rem] shrink-0 items-center justify-center text-fg-muted"
      >
        <GlobeIcon className="h-4 w-4" />
      </span>
    );
  }

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={
        visible ? `fi fi-${iso2.toLowerCase()} ${BOX_CLASS_NAME}` : `${BOX_CLASS_NAME} bg-well`
      }
    />
  );
}
