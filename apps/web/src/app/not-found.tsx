import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { NOT_FOUND_ICON } from '@/lib/categoryIcon';

export const metadata: Metadata = {
  title: 'Page Not Found',
};

export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6">
        <Link href="/" aria-label="Go back to home">
          <div
            data-testid="not-found-icon"
            className="flex items-center justify-center w-48 h-48 rounded-2xl bg-white/10 p-4"
          >
            <Image src={NOT_FOUND_ICON} alt="" width={128} height={128} aria-hidden />
          </div>
        </Link>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white">Oops! We couldn&apos;t find that...</h1>
          <p className="mt-4 text-gray-400">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
        </div>
      </div>
    </main>
  );
}
