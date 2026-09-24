import type { Metadata } from 'next';

import { SiteLogoIcon } from '@/components/icons';
import { siteUrl } from '@/lib/siteUrl';

const TITLE = 'eco-metrics earth';
const DESCRIPTION = 'Track and visualize environmental metrics for a sustainable planet.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${siteUrl()}/`,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${siteUrl()}/`,
  },
  twitter: {
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function HomePage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-start pt-14 px-4"
    >
      <div className="flex flex-col items-center gap-6 mt-14 lg:mt-0">
        <div className="flex items-center justify-center w-48 h-48 rounded-2xl bg-gray-300 dark:bg-white/10 p-4">
          <SiteLogoIcon aria-hidden className="w-32 h-32" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">eco-metrics earth</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Environmental metrics dashboard — coming soon.
          </p>
        </div>
      </div>
    </main>
  );
}
