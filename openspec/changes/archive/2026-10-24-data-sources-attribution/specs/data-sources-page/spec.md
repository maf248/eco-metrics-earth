## ADDED Requirements

### Requirement: Data sources page route and rendering

The web app SHALL serve `/data-sources/` from a dedicated static route that takes precedence over `[category]`. It SHALL render, server-side, an `<h1>Data sources</h1>` inside `<main id="main-content" tabIndex={-1}>`, an introduction, and up to two sections, each a `<section>` labelled by its heading: "Live data providers" (`catalog.providers`) and "Cited publications" (`catalog.datasets`). The "Live data providers" section SHALL be rendered only when `providers` is non-empty (no empty-state message), and the introduction SHALL describe only the sections that are rendered. The list of sources SHALL come only from `GET /api/v1/data-sources`; the web app SHALL NOT hardcode any provider, publication, license or date.

#### Scenario: Both sections render when both are populated

- **GIVEN** a catalog with one provider and one dataset
- **WHEN** the page is rendered
- **THEN** it shows the heading "Data sources", the "Live data providers" section and the "Cited publications" section
- **AND** the introduction mentions live providers

#### Scenario: Providers section absent when empty

- **GIVEN** a catalog whose `providers` array is empty and one dataset
- **WHEN** the page is rendered
- **THEN** no "Live data providers" heading, section or empty-state text exists, the introduction does not mention live providers, and the "Cited publications" section is shown

#### Scenario: Live provider entry

- **GIVEN** a catalog with a provider `{ provider: 'P', license: 'L', sourceUrl: 'https://p.example', lastUpdated: T, lastUpdatedBasis: 'provider' }`
- **WHEN** the page is rendered
- **THEN** the entry shows the provider name as an external link to `sourceUrl`, its description, the license `L`, and a `<time dateTime=T>` with wording indicating the provider reported the date
- **AND** with `lastUpdatedBasis: 'retrieval'` the wording indicates the date is when we retrieved the data

#### Scenario: Static dataset entry and publications

- **GIVEN** a catalog with a dataset with two publications, one with a `publisher` and one without
- **WHEN** the page is rendered
- **THEN** the dataset shows its name and description
- **AND** each publication shows its citation as an external link (`target="_blank"`, `rel="noopener noreferrer"`), "Published <publishedYear>" and its entry count
- **AND** only the publication with a `publisher` shows "Republished by" followed by the publisher link and its license in parentheses

#### Scenario: Categories link to their pages

- **GIVEN** a source whose `categories` include `water-footprint`
- **WHEN** the page is rendered
- **THEN** it links to `/water-footprint/` with the category title

### Requirement: Data sources page is generated on first request and cached for a day

The `/data-sources/` page SHALL NOT call the BFF during `next build`. It SHALL be generated on its first request and then served from cache for at most 24 hours (`revalidate` of 86400 s on the BFF fetch), with `maxDuration = 30` covering the worst-case fetch (2 attempts x 10 s). The mechanism (on-demand route with fetch-level revalidation, or a dynamic segment with an empty `generateStaticParams`) SHALL be the one validated by the implementation spike; the observable contract is the same for both.

#### Scenario: Build does not need the BFF

- **WHEN** `npx nx build web` runs with no API listening
- **THEN** the build succeeds
- **AND** the output does not contain a pre-rendered `/data-sources/` page produced from BFF data

#### Scenario: First request generates the page

- **GIVEN** no cached `/data-sources/` and a reachable BFF
- **WHEN** the page is requested
- **THEN** the BFF is called once and the page renders with status 200

#### Scenario: Subsequent requests use the cache

- **GIVEN** a page generated less than 24 h ago
- **WHEN** it is requested again
- **THEN** the BFF is not called again

### Requirement: Resilience to cold starts and BFF outages

`getDataSources()` SHALL use the generic BFF fetch helper (2 attempts x 10 s, no delay, shape validation) and SHALL throw when every attempt fails. The page SHALL NOT catch that error, so an unavailable BFF is never rendered as an empty catalog and never cached: when previously cached content exists it keeps being served after a failed refresh; when none exists the app's `error.tsx` is shown.

#### Scenario: Cold start recovered by retry

- **GIVEN** the first attempt times out and the second succeeds
- **WHEN** `getDataSources()` runs
- **THEN** it resolves with the catalog and logs no error

#### Scenario: BFF down with cached content

- **GIVEN** a cached `/data-sources/` page and a BFF that fails both attempts
- **WHEN** the page is revalidated
- **THEN** one error is logged and visitors keep receiving the cached page

#### Scenario: BFF down without cached content

- **GIVEN** no cached page and a BFF that fails both attempts
- **WHEN** the page is requested
- **THEN** `error.tsx` is shown and nothing is cached

#### Scenario: Malformed catalog payload

- **GIVEN** the BFF returns `{ success: true, data: {} }`
- **WHEN** `getDataSources()` runs
- **THEN** the shape guard rejects it on both attempts and the helper throws

### Requirement: Data sources page SEO

The page SHALL export metadata with title `Data sources` (rendered `Data sources | eco-metrics earth`), a description unique among site pages, `alternates.canonical` = `${siteUrl()}/data-sources/`, and `openGraph` / `twitter` built with `buildOpenGraph` / `buildTwitter` from `@/lib/socialMetadata`. The page SHALL NOT emit JSON-LD.

#### Scenario: Metadata

- **WHEN** `generateMetadata` (or the `metadata` export) is evaluated
- **THEN** the title, description, canonical URL ending in `/data-sources/`, and the OpenGraph and Twitter fields (including the shared card image) are present

#### Scenario: Canonical in the rendered HTML

- **WHEN** `/data-sources/` is loaded in a browser
- **THEN** `link[rel="canonical"]` ends with `/data-sources/` and `og:title` matches the page title

### Requirement: Shared source attribution component

The web app SHALL provide `SourceAttribution` (`apps/web/src/components/SourceAttribution.tsx`), a stateless component that accepts a `DataSourcePublisher` (`Pick<DataSourceAttribution, 'provider' | 'license' | 'sourceUrl'>`, so a full `DataSourceAttribution` is assignable) and renders only "<provider as external link> (<license>)". It adds no lead-in text, date or link: each caller supplies its own wording ("via", "Republished by", "Some values are republished by", or "Data:" on a future chart). It SHALL be the single place that renders a publisher link with its license, reused by the per-row attribution in `WaterFootprintTable`, the publications on the data sources page and the water-footprint note. It SHALL use only design-system color tokens and the project focus-ring pattern on links.

#### Scenario: Renders provider link and license

- **GIVEN** `{ provider: 'Our World in Data', license: 'CC BY 4.0', sourceUrl: 'https://ourworldindata.org' }`
- **WHEN** the component renders
- **THEN** it shows a link named `Our World in Data` with `href` `https://ourworldindata.org`, `target` `_blank`, `rel` `noopener noreferrer`, followed by the text `(CC BY 4.0)`

#### Scenario: Accepts a full DataSourceAttribution

- **GIVEN** a `DataSourceAttribution` with `lastUpdated`
- **WHEN** it is passed as `source`
- **THEN** it type-checks and no date is rendered

### Requirement: Accessibility of the data sources page

The page SHALL have zero critical and serious axe violations in light and dark themes, use a single `h1` with `h2` section headings, and keep all links distinguishable beyond color (underline).

#### Scenario: Axe audit

- **WHEN** the E2E accessibility spec visits `/data-sources/`
- **THEN** there are zero critical and serious violations

### Requirement: Data sources page E2E against the real BFF

Playwright E2E (`test(...)`, in `e2e/`) SHALL cover `/data-sources/` against the real BFF.

#### Scenario: Page lists the real sources

- **WHEN** `/data-sources/` is loaded
- **THEN** the response status is 200 and the `h1` is "Data sources"
- **AND** the page contains the water-footprint dataset, the citation "Poore & Nemecek (2018), Science" once with "Published 2018", and "Our World in Data" with "CC BY 4.0"
- **AND** the server-rendered HTML contains the same content

#### Scenario: Reachable from the footer and the water-footprint page

- **WHEN** the user follows the "Data sources" link in the footer, or the link in the water-footprint attribution note
- **THEN** the browser lands on `/data-sources/`
