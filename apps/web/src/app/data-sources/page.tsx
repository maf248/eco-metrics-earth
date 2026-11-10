import type { Metadata } from 'next';
import { connection } from 'next/server';

import { NavigationLink } from '@/components/NavigationLink';
import { SourceAttribution } from '@/components/SourceAttribution';
import { getCategoryTitle } from '@/lib/categoryTitle';
import { getDataSources } from '@/lib/dataSources';
import { formatUtcDate } from '@/lib/formatUtcDate';
import { LINK_CLASS_NAME } from '@/lib/linkClassName';
import { siteUrl } from '@/lib/siteUrl';
import { buildOpenGraph, buildTwitter } from '@/lib/socialMetadata';
import type {
  DataSourcePublication,
  EcoCategory,
  LiveDataSource,
  LiveDataSourceOrigin,
  StaticDataSource,
} from '@eco-metrics/shared';

// `connection()` keeps `next build` from calling the BFF, and blocking here delivers the whole
// page in the first response; the fetch Data Cache keeps the catalog for a day and keeps
// serving it, stale, if a refresh fails.
export const instant = false;
// Covers the worst-case BFF fetch (2 attempts x 10 s) within the Vercel Hobby limit.
export const maxDuration = 30;

const TITLE = 'Data sources';
const DESCRIPTION =
  'Who produced the data behind eco-metrics earth: the publications, publishers, licenses and dates of every source in use.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${siteUrl()}/data-sources/` },
  openGraph: buildOpenGraph({
    title: TITLE,
    description: DESCRIPTION,
    url: `${siteUrl()}/data-sources/`,
  }),
  twitter: buildTwitter({ title: TITLE, description: DESCRIPTION }),
};

export default async function DataSourcesPage() {
  await connection();
  const { providers, datasets } = await getDataSources();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-header">
      <div className="mt-14 space-y-10 pb-8 lg:mt-0">
        <header>
          <h1 className="text-4xl font-bold text-fg">Data sources</h1>
          <p className="mt-4 text-fg-secondary">
            Every figure on this site comes from a source listed here, with its publisher, license
            and date.
            {providers.length > 0
              ? ' Live providers are queried at runtime; cited publications are compiled into static datasets.'
              : ' Values are compiled from the cited publications below.'}
          </p>
        </header>

        {providers.length > 0 && (
          <section aria-labelledby="live-providers-heading">
            <h2 id="live-providers-heading" className="text-2xl font-semibold text-fg">
              Live data providers
            </h2>
            <ul className="mt-4 space-y-4">
              {providers.map((provider) => (
                <LiveProvider key={provider.id} provider={provider} />
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="cited-publications-heading">
          <h2 id="cited-publications-heading" className="text-2xl font-semibold text-fg">
            Cited publications
          </h2>
          <ul className="mt-4 space-y-4">
            {datasets.map((dataset) => (
              <Dataset key={dataset.id} dataset={dataset} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

const CARD_CLASS_NAME = 'rounded-lg border border-line-strong bg-surface-raised p-4';

function Categories({ categories }: { categories: EcoCategory[] }) {
  return (
    <p className="mt-2 text-sm text-fg-secondary">
      Used in:{' '}
      {categories.map((category, index) => (
        <span key={category}>
          {index > 0 && ', '}
          <NavigationLink href={`/${category}/`} className={LINK_CLASS_NAME}>
            {getCategoryTitle(category)}
          </NavigationLink>
        </span>
      ))}
    </p>
  );
}

function LiveProvider({ provider }: { provider: LiveDataSource }) {
  return (
    <li className={CARD_CLASS_NAME}>
      <h3 className="font-semibold text-fg">
        <a
          href={provider.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS_NAME}
        >
          {provider.provider}
        </a>
      </h3>
      <p className="mt-1 text-fg-body">{provider.description}</p>
      <p className="mt-2 text-sm text-fg-body">License: {provider.license}</p>
      <p className="text-sm text-fg-body">
        {provider.lastUpdatedBasis === 'provider'
          ? 'Last updated by the provider on '
          : 'Last retrieved by us on '}
        <time dateTime={provider.lastUpdated}>{formatUtcDate(provider.lastUpdated)}</time>
      </p>
      <Categories categories={provider.categories} />
      <Origins origins={provider.origins} />
    </li>
  );
}

function Origins({ origins }: { origins: LiveDataSourceOrigin[] }) {
  if (origins.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-line-subtle pt-4">
      <h4 className="text-sm font-semibold text-fg">Data produced by</h4>
      <ul className="mt-2 space-y-3">
        {origins.map((origin) => (
          <li key={`${origin.producer}|${origin.title}`} className="text-sm text-fg-body">
            {origin.producer}:{' '}
            <a
              href={origin.url}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS_NAME}
            >
              {origin.title}
            </a>{' '}
            (License:{' '}
            <a
              href={origin.license.url}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS_NAME}
            >
              {origin.license.name}
            </a>
            ){origin.notice && <p className="text-fg-muted">{origin.notice}</p>}
            {origin.citation && <p className="text-fg-muted">{origin.citation}</p>}
            <Categories categories={origin.categories} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Dataset({ dataset }: { dataset: StaticDataSource }) {
  return (
    <li className={CARD_CLASS_NAME}>
      <h3 className="font-semibold text-fg">{dataset.name}</h3>
      <p className="mt-1 text-fg-body">{dataset.description}</p>
      <Categories categories={dataset.categories} />
      <ul className="mt-4 space-y-3 border-t border-line-subtle pt-4">
        {dataset.publications.map((publication) => (
          <Publication
            key={`${publication.citation}|${publication.url}`}
            publication={publication}
          />
        ))}
      </ul>
    </li>
  );
}

function Publication({ publication }: { publication: DataSourcePublication }) {
  const { citation, url, publishedYear, entryCount, publisher } = publication;

  return (
    <li className="text-sm text-fg-body">
      <a href={url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS_NAME}>
        {citation}
      </a>
      <p className="text-fg-muted">
        Published {publishedYear} · {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
      </p>
      {publisher && (
        <p className="text-fg-muted">
          Republished by <SourceAttribution source={publisher} />
        </p>
      )}
    </li>
  );
}
