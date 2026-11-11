'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { NotFoundIcon } from '@/components/icons';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    // eslint-disable-next-line no-console
    console.error('Uncaught error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-start pt-header px-4">
      <div className="flex flex-col items-center gap-6 mt-14 lg:mt-0">
        <div
          data-testid="error-icon"
          aria-label="Error"
          className="flex items-center justify-center w-48 h-48 rounded-2xl bg-well p-4"
        >
          <NotFoundIcon aria-hidden className="w-32 h-32 drop-shadow-icon-xl" />
        </div>
        <div className="text-center" role="alert">
          <h1 className="text-4xl font-bold text-fg">Oops! Something went wrong…</h1>
          <p className="mt-4 text-fg-secondary">
            An unexpected error occurred while loading this page.
          </p>
          <div className="mt-6 flex flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={reset}
              className="px-6 py-3 rounded-lg bg-accent-solid text-on-accent font-medium hover:bg-accent-solid-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset transition-colors duration-150"
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
