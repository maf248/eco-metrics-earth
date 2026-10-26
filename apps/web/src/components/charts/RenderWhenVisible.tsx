'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { ChartSkeleton } from './ChartSkeleton';

interface RenderWhenVisibleProps {
  children: ReactNode;
}

// Start a little before the chart enters the viewport so it is ready when it arrives.
const ROOT_MARGIN = '200px';

/**
 * Keeps a below-the-fold chart out of the page until it scrolls near the
 * viewport: a same-height skeleton is rendered (on the server too) and the
 * children, which start the lazy ECharts chunk, mount on the first intersection.
 * The first chart of a page should not use it. Without `IntersectionObserver`
 * the children mount immediately.
 */
export function RenderWhenVisible({ children }: RenderWhenVisibleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (typeof IntersectionObserver === 'undefined' || !element) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef}>{visible ? children : <ChartSkeleton />}</div>;
}
