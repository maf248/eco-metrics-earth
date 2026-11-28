'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the root layout. */
  retry: () => void;
}

/**
 * Root-level fallback, shown when the root layout itself fails. It replaces the layout, so no
 * global stylesheet or design tokens are loaded: it is deliberately minimal and unstyled.
 */
export default function GlobalError({ error, retry }: GlobalErrorProps) {
  useEffect(() => {
    // An error with a digest happened on the server and Next's onRequestError already reported it.
    if (error.digest === undefined) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <h1>Something went wrong</h1>
        <p>An unexpected error occurred.</p>
        <button type="button" onClick={() => retry()}>
          Try again
        </button>
      </body>
    </html>
  );
}
