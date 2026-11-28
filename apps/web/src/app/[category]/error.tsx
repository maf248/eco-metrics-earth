'use client';

import * as Sentry from '@sentry/nextjs';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

import { CATEGORY_PAGE_CLASS_NAME, CategoryHeader } from '@/components/CategoryHeader';
import { DataUnavailable } from '@/components/DataUnavailable';
import { isEcoCategory } from '@/lib/isEcoCategory';

interface CategoryErrorProps {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the page (Next 16's recommended recovery, unlike `reset`). */
  retry: () => void;
}

/**
 * Error boundary of a category. A server render error (it carries a `digest`) is in practice a
 * failed data load with no cached page left to serve: the category keeps its header and shows the warning
 * panel of a provider outage, and the failed render stays a 5xx. An error raised in the browser
 * (no `digest`) is a rendering failure, not missing data, so it gets a generic message instead.
 * Never the not-found page: unknown slugs never reach here.
 */
export default function CategoryError({ error, retry }: CategoryErrorProps) {
  const { category } = useParams<{ category: string }>();

  useEffect(() => {
    // An error with a digest happened on the server and Next's onRequestError already reported it.
    if (error.digest === undefined) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className={CATEGORY_PAGE_CLASS_NAME}>
      {isEcoCategory(category) ? <CategoryHeader category={category} /> : null}
      {error.digest === undefined ? (
        <div role="alert" className="mt-8 max-w-prose text-center">
          <h2 className="text-xl font-semibold text-fg">Something went wrong</h2>
          <p className="mt-2 text-fg-body">An unexpected error occurred while showing this page.</p>
        </div>
      ) : (
        <DataUnavailable />
      )}
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 mb-12 px-6 py-3 rounded-lg bg-control text-fg-body font-medium hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset transition-colors duration-150"
      >
        Try again
      </button>
    </div>
  );
}
