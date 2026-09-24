'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { NotFoundIcon } from '@/lib/categoryIcon';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export const metadata = {
  title: 'Something went wrong',
  description: 'An unexpected error occurred. Please try again or return to the home page.',
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    // eslint-disable-next-line no-console
    console.error('Uncaught error:', error);
  }, [error]);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-start pt-14 px-4"
    >
      <div className="flex flex-col items-center gap-6 mt-14 lg:mt-0">
        <div
          data-testid="error-icon"
          aria-label="Error"
          className="flex items-center justify-center w-48 h-48 rounded-2xl bg-gray-300 dark:bg-white/10 p-4"
        >
          <NotFoundIcon
            aria-hidden
            className="w-32 h-32 drop-shadow-xl dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]"
          />
        </div>
        <div className="text-center" role="alert">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Oops! Something went wrong…
          </h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            An unexpected error occurred while loading this page.
          </p>
          <div className="mt-6 flex flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={reset}
              className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-gray-950 transition-colors duration-150"
            >
              Try again
            </button>
            <Link
              href="/"
              className="px-6 py-3 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-gray-950 transition-colors duration-150"
            >
              Go back home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
