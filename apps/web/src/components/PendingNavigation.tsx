'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useTransition,
} from 'react';
import type { ReactNode } from 'react';

interface PendingNavigationValue {
  /** Destination of the navigation in progress; `null` when there is none. */
  pendingHref: string | null;
  navigate: (href: string) => void;
}

const PendingNavigationContext = createContext<PendingNavigationValue>({
  pendingHref: null,
  navigate: () => undefined,
});

/**
 * Tracks the navigation in progress. The destination is optimistic state of the navigation's
 * own transition, so React clears it when the route commits, or fails, with nothing to reset.
 */
export function PendingNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useOptimistic<string | null>(null);

  // The pending view moves the page to the top before the history entry changes, so the browser
  // remembers the top for the page left behind. That entry keeps the real position, used once:
  // on the next frame because the browser applies its own after this event, and only once
  // because the browser remembers later departures correctly.
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const { scrollY: top, ...state } = (event.state ?? {}) as { scrollY?: number };
      if (top === undefined) return;
      window.history.replaceState(state, '');
      requestAnimationFrame(() => window.scrollTo({ top, behavior: 'instant' }));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      window.history.replaceState({ ...window.history.state, scrollY: window.scrollY }, '');
      startTransition(() => {
        setPendingHref(href);
        router.push(href);
      });
    },
    [router, setPendingHref],
  );

  const value = useMemo(() => ({ pendingHref, navigate }), [pendingHref, navigate]);

  return <PendingNavigationContext value={value}>{children}</PendingNavigationContext>;
}

export function usePendingNavigation(): PendingNavigationValue {
  return use(PendingNavigationContext);
}
