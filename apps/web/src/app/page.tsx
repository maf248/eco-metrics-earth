import type { Metadata } from 'next';

import { SiteLogoIcon } from '@/components/icons';
import { siteUrl } from '@/lib/siteUrl';
import { SITE_DESCRIPTION, buildOpenGraph, buildTwitter } from '@/lib/socialMetadata';

const TITLE = 'eco-metrics earth | CO2, Climate, Energy & Water Data';
const DESCRIPTION = SITE_DESCRIPTION;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${siteUrl()}/`,
  },
  openGraph: buildOpenGraph({
    title: TITLE,
    description: DESCRIPTION,
    url: `${siteUrl()}/`,
  }),
  twitter: buildTwitter({
    title: TITLE,
    description: DESCRIPTION,
  }),
};

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-start pt-header px-4">
      <div className="flex flex-col items-center gap-6 mt-14 lg:mt-0">
        <div className="flex items-center justify-center w-48 h-48 rounded-2xl bg-well p-4">
          <SiteLogoIcon aria-hidden className="w-32 h-32" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-fg">eco-metrics earth</h1>
          <p className="mt-4 text-fg-secondary">Environmental metrics dashboard — coming soon.</p>
        </div>
      </div>
    </div>
  );
}
