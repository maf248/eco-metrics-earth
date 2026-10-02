import type { Metadata } from 'next';
import Link from 'next/link';

import { NotFoundIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist. Return to eco-metrics earth.',
};

export default function NotFound() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-start pt-14 px-4"
    >
      <div className="flex flex-col items-center gap-6 mt-14 lg:mt-0">
        <Link href="/" aria-label="Go back to home">
          <div
            data-testid="not-found-icon"
            className="flex items-center justify-center w-48 h-48 rounded-2xl bg-gray-300 dark:bg-white/10 p-4"
          >
            <NotFoundIcon
              aria-hidden
              className="w-32 h-32 drop-shadow-xl dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]"
            />
          </div>
        </Link>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Oops! We couldn&apos;t find that...
          </h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
        </div>
      </div>
    </main>
  );
}
