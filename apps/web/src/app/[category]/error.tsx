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
 * A category whose data could not be loaded at all, with no cached page to serve: the category
 * keeps its header and shows the same warning panel as a provider outage, never the generic error
 * or the not-found page (unknown slugs never reach here). The failed server render stays a 5xx.
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
      <DataUnavailable />
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
