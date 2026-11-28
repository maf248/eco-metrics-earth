'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';

import { ErrorIcon } from '@/components/icons';
import { PAGE_TITLE_CLASS_NAME } from '@/lib/pageTitleClassName';

interface ErrorPageProps {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the failed segment. */
  retry: () => void;
}

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    // An error with a digest happened on the server and Next's onRequestError already reported it.
    if (error.digest === undefined) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-start pt-header px-4">
      <div className="flex flex-col items-center gap-6 mt-14 lg:mt-0">
        <div
          data-testid="error-icon"
          className="flex items-center justify-center w-48 h-48 rounded-2xl bg-well p-4"
        >
          <ErrorIcon aria-hidden className="w-32 h-32 drop-shadow-icon-xl" />
        </div>
        <div className="text-center">
          {/* The live region holds only the message, so the buttons are not read as part of it. */}
          <div role="alert">
            <h1 className={PAGE_TITLE_CLASS_NAME}>Oops! Something went wrong…</h1>
            <p className="mt-4 text-fg-secondary">
              An unexpected error occurred while loading this page.
            </p>
          </div>
          <div className="mt-6 flex flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => retry()}
              className="px-6 py-3 rounded-lg bg-accent-solid-strong text-on-accent font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset transition-colors duration-150"
            >
              Try again
            </button>
            <Link
              href="/"
              className="px-6 py-3 rounded-lg bg-control text-fg-body font-medium hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset transition-colors duration-150"
            >
              Go back home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
