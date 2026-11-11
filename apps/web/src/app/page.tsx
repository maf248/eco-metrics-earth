import type { Metadata } from 'next';

import { SiteLogoIcon } from '@/components/icons';
import { JsonLd } from '@/components/JsonLd';
import { NavigationLink } from '@/components/NavigationLink';
import { SmoothAnchor } from '@/components/SmoothAnchor';
import { TypewriterText } from '@/components/TypewriterText';
import { getCategoryIcon } from '@/lib/categoryIcon';
import { getCategoryMetadataTitle } from '@/lib/categoryMetadata';
import { getCategoryTitle } from '@/lib/categoryTitle';
import { LINK_CLASS_NAME } from '@/lib/linkClassName';
import { LIVE_CATEGORIES, LIVE_CATEGORY_SUMMARIES } from '@/lib/liveCategories';
import { PAGE_TITLE_CLASS_NAME } from '@/lib/pageTitleClassName';
import { buildSiteJsonLd } from '@/lib/siteStructuredData';
import { siteUrl } from '@/lib/siteUrl';
import { SITE_DESCRIPTION, buildOpenGraph, buildTwitter } from '@/lib/socialMetadata';
import type { EcoCategory } from '@eco-metrics/shared';

const TITLE = 'eco-metrics earth | CO2, Climate, Energy & Water Data';
const DESCRIPTION = SITE_DESCRIPTION;
const HEADLINE = 'Environmental data, made readable';

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

const SECTION_HEADING_CLASS_NAME = 'text-2xl font-semibold text-fg';

/**
 * A live category on the home: icon, keyword-bearing title, one sentence and a single link
 * stretched over the whole card, so the card is one target with one accessible name.
 */
function CategoryCard({ category }: { category: EcoCategory }) {
  const Icon = getCategoryIcon(category);

  return (
    <li className="group relative flex flex-col rounded-2xl border border-line-strong bg-surface-card p-5 transition-colors duration-150 hover:bg-hover has-focus-visible:ring-2 has-focus-visible:ring-focus-ring has-focus-visible:ring-offset-2 ring-offset-focus-offset sm:p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-well p-2.5">
          {/* getCategoryIcon returns a stable ref to an existing component, not one created during render. */}
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Icon aria-hidden className="h-full w-full drop-shadow-icon-sm" />
        </div>
        <h3 className="text-lg font-semibold text-fg">{getCategoryMetadataTitle(category)}</h3>
      </div>
      <p className="mt-4 grow text-fg-body">{LIVE_CATEGORY_SUMMARIES[category]}</p>
      <p className="mt-4">
        <NavigationLink
          href={`/${category}/`}
          className="font-medium text-accent underline underline-offset-4 after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none group-hover:text-accent-hover"
        >
          Explore {getCategoryTitle(category)}
          <span aria-hidden="true"> →</span>
        </NavigationLink>
      </p>
    </li>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-start px-4 pt-header">
      <JsonLd data={buildSiteJsonLd(siteUrl())} />

      <div className="mt-14 flex max-w-3xl flex-col items-center gap-6 text-center lg:mt-0">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-well p-4">
          <SiteLogoIcon aria-hidden className="h-16 w-16 drop-shadow-icon-lg" />
        </div>
        <div>
          <h1 aria-label={HEADLINE} className={PAGE_TITLE_CLASS_NAME}>
            <TypewriterText text={HEADLINE} />
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-fg-secondary">{SITE_DESCRIPTION}</p>
        </div>
        {/* `accent-solid-strong`, not `accent-solid`: white body-size text needs 4.5:1. */}
        <SmoothAnchor
          href="#topics"
          className="rounded-lg bg-accent-solid-strong px-6 py-3 font-medium text-on-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset"
        >
          Explore the data
          <span aria-hidden="true"> ↓</span>
        </SmoothAnchor>
      </div>

      <div className="mt-12 w-full max-w-4xl space-y-12 pb-12">
        <section id="topics" aria-labelledby="topics-heading" className="scroll-mt-header">
          <h2 id="topics-heading" className={SECTION_HEADING_CLASS_NAME}>
            Explore the data
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {LIVE_CATEGORIES.map((category) => (
              <CategoryCard key={category} category={category} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="sources-heading">
          <h2 id="sources-heading" className={SECTION_HEADING_CLASS_NAME}>
            Where the data comes from
          </h2>
          <p className="mt-4 text-fg-body">
            Every figure on this site comes from an open, cited source, with its publisher, license
            and date. See the{' '}
            <NavigationLink href="/data-sources/" className={LINK_CLASS_NAME}>
              data sources
            </NavigationLink>{' '}
            behind each topic.
          </p>
        </section>
      </div>
    </div>
  );
}
