# Design: data-sources-attribution

## 1. Contract (`@eco-metrics/shared`, types only)

New file `packages/shared/src/lib/data-sources.ts`, exported from the package root. `DataSourceAttribution` (provider, license, sourceUrl, lastUpdated) is kept unchanged and reused.

```ts
/** What the lastUpdated timestamp of a live source means. */
export type DataSourceTimestampBasis =
  | 'provider' // the provider's own last-update timestamp
  | 'retrieval'; // when we last fetched the data (provider gives none)

/** Who publishes/licenses data. Same field names as DataSourceAttribution. */
export type DataSourcePublisher = Pick<DataSourceAttribution, 'provider' | 'license' | 'sourceUrl'>;

/** Live provider: data consumed through an external API at runtime. */
export interface LiveDataSource extends DataSourceAttribution {
  id: string; // stable, unique across the catalog
  description: string;
  categories: EcoCategory[]; // pages that show this provider's data
  lastUpdatedBasis: DataSourceTimestampBasis;
}

/** One distinct cited publication inside a static dataset. */
export interface DataSourcePublication {
  citation: string; // dataset `source` field
  url: string; // dataset `sourceUrl` field
  publishedYear: number; // parsed from the citation, e.g. 2018
  entryCount: number; // dataset rows that cite it
  publisher?: DataSourcePublisher; // present when republished by a licensor (e.g. OWID, CC BY)
}

/** Static ("cold") dataset compiled from publications and bundled with the API. */
export interface StaticDataSource {
  id: string;
  name: string;
  description: string;
  categories: EcoCategory[];
  publications: DataSourcePublication[];
}

export interface DataSourcesCatalog {
  providers: LiveDataSource[]; // live; sorted by id
  datasets: StaticDataSource[]; // static; sorted by id; publications sorted by citation
}
```

`WaterFootprintProduct` (shared) gains one optional field, `publisher?: DataSourcePublisher`.

Why two top-level arrays and not one union list: the page renders two sections with different semantics (a provider is licensed as a whole and has one timestamp; a dataset is a bibliography with a publication year and optional publisher per citation). Separate arrays make the web rendering and the contract self-documenting and keep type guards trivial.

`GET /api/v1/data-sources` returns `ApiResponse<DataSourcesCatalog>` (`{ success: true, data, status: 200 }`), **without** `meta` (`meta.source` is a single attribution and is not meaningful for a catalog).

## 2. Aggregation mechanism (API): decorator + `DiscoveryService`

New module `apps/api/src/modules/data-sources/`:

- `data-source-contributor.ts`: `DataSourceContributor` decorator (created with `DiscoveryService.createDecorator()`, metadata-only) and the interface `DataSourceContributorProvider { getDataSources(): DataSourceContribution[] | Promise<DataSourceContribution[]> }`, where `DataSourceContribution` is `{ kind: 'provider'; source: LiveDataSource } | { kind: 'dataset'; source: StaticDataSource }` (API-internal type).
- `data-sources.service.ts`: injects `DiscoveryService`, calls `getProviders({ metadata })` for the decorator key, awaits every `instance.getDataSources()`, partitions by `kind`, sorts deterministically, and rejects duplicate `id`s. An `onApplicationBootstrap` hook performs one collection so a duplicate id or malformed contribution fails the boot instead of the first request.
- `data-sources.controller.ts`: `GET data-sources`, Swagger tag `Data Sources`, `@ApiOperation`, `@ApiOkResponse`.
- `data-sources.module.ts`: imports `DiscoveryModule`; imported by `AppModule`.

A module opts in by decorating one of its own providers with `@DataSourceContributor()` and implementing `getDataSources()`. `DataSourcesModule` imports no feature module and no feature module imports it. Deleting a feature module removes its provider from the container, so `DiscoveryService` no longer finds it and its sources vanish from `/api/v1/data-sources`, from the web page, and from the footer-linked content, with zero other edits.

Alternatives considered:

- **Injection token each module provides (multi-provider).** Nest has no multi-provider; aggregation would need `DataSourcesModule` to import every feature module (or `forRoot([...modules])`), which is exactly the hand-maintained list we want to avoid. Rejected.
- **Static registry file or array in `DataSourcesModule`.** Hand-maintained duplicate; deleting a module leaves a dangling entry. Rejected.
- **Each controller exposes its own `/sources` endpoint and the web aggregates.** Pushes the single-source-of-truth problem into the web and multiplies BFF calls. Rejected.
- **Contributions from the shared package or a JSON file in the web.** Violates "shared holds only types" and the no-duplication rule. Rejected.

Risk: `DiscoveryService.createDecorator` and `getProviders({ metadata })` must be verified against the installed `@nestjs/core` 12.1.2 (task 1 of the API section is a short confirmation; the equivalent manual form is `Reflector` + `getProviders()` filtering on `Reflect.getMetadata`). SWC-compiled decorators already work in this repo.

## 3. Static dataset: bibliography and dates derived from the dataset

`WaterFootprintService` is decorated with `@DataSourceContributor()`. Its `getDataSources()` returns one `dataset` contribution (`id: 'water-footprint'`, `categories: ['water-footprint']`):

- `publications`: group the loaded rows by the pair (`source`, `sourceUrl`); `entryCount` = rows in the group; `publisher` from `resolvePublisher(sourceUrl)`; ordering is left to the aggregator. Nothing is re-typed; adding, changing or removing a row changes the bibliography. If the dataset is empty (missing file path), the service contributes nothing.
- **Date = publication year of each citation.** A static dataset has no meaningful "last updated"; the honest date of a cited publication is when it was published. Every `source` in `water-footprint.json` contains a four-digit year in parentheses (verified: all 15 distinct pairs match `\((\d{4})\)`), so `publishedYear` is the single `\((\d{4})\)` match of the citation; a citation with zero or several matches is ambiguous and fails construction. There is no metadata file, no hand-maintained date and no `lastUpdated` on a static dataset. The page shows "Published <year>" per publication.
- **Fail-fast at construction.** The service validates every row's `source` when it loads the dataset and throws an `Error` naming the product and citation if no year parses. Justification: it matches the existing loader philosophy (malformed data stops the boot) and prevents shipping a source with no date, whereas a test-only guard would let a bad row reach production if the test is skipped or the dataset is replaced. A unit test over the real dataset also asserts all rows parse.

Alternatives rejected: a sibling `water-footprint.meta.json` with a compilation date (hand-bumped, drifts from the data, explains nothing to a reader); wrapping the array as `{ meta, products }` (breaks the loader contract); git/file mtime (unavailable in the Cloud Run image).

## 4. OWID modeling and publisher resolution

- `apps/api/src/common/publishers/publishers.ts` (pure constants, no Nest imports) defines OWID once, so `common/` never imports from `modules/`; `apps/api/src/modules/providers/owid/owid.attribution.ts` re-exports it for the future live OWID endpoint: `OWID_PUBLISHER: DataSourcePublisher = { provider: 'Our World in Data', license: 'CC BY 4.0', sourceUrl: 'https://ourworldindata.org' }`. There is deliberately no builder for a full `DataSourceAttribution` yet: the future live OWID endpoint adds it when it has a real caller.
- `apps/api/src/common/publishers/resolve-publisher.ts` exports `resolvePublisher(sourceUrl): DataSourcePublisher | undefined`, a small host-to-publisher map (today `ourworldindata.org` -> `OWID_PUBLISHER`; unknown hosts -> `undefined`; an unparsable URL throws, and `WaterFootprintService` resolves every row at construction so a malformed `sourceUrl` fails the boot). It is the only place that knows which hosts have a licensor, and it is used twice: (a) when `WaterFootprintService` returns rows (`getAllProducts` / `getByCategory` return copies with `publisher` added when resolved, so the stored JSON and the row contract stay otherwise untouched), and (b) when it derives the bibliography. The citation stays a citation; the publisher/license is attributed alongside it.
- OWID is not registered as a live provider in this change (see non-goals). `OwidClient` is untouched.
- Alternatives: an explicit `publisher` field on the 37 JSON rows (duplicates what the URL already says); web hardcoding "OWID, CC BY" (violates single source of truth). The cost of the chosen approach is a plain file import of the constants from `providers/owid/` (no Nest module dependency).

## 5. Web

### 5.1 Generic BFF fetch helper

`apps/web/src/lib/bffFetch.ts`:

```ts
export async function fetchFromBff<T>(options: {
  path: string; // e.g. '/data-sources'
  label: string; // human name for logs/errors, e.g. 'Water footprint data'
  isData: (data: unknown) => data is T; // runtime shape guard for `data`
}): Promise<T>;
```

It owns what `waterFootprint.ts` owns today: `apiBaseUrl()` + path, `internalApiHeaders()`, `next: { revalidate: 86400 }`, a fresh `AbortSignal.timeout(10_000)` per attempt, 2 attempts, no delay, envelope check (`success === true` and `isData(data)`), exactly one `console.error` on final failure (no headers), and a thrown `Error(`${label} could not be fetched from the BFF`, { cause })`. `getWaterFootprintProducts()` becomes a three-line wrapper (`label: 'Water footprint data'`, guard `Array.isArray`), so its public signature, messages and the existing `waterFootprint.test.ts` stay valid untouched. `getDataSources()` in `lib/dataSources.ts` is the second consumer, with a guard asserting `providers` and `datasets` are arrays.

### 5.2 Route `/data-sources/` and the build-independence constraint

`apps/web/src/app/data-sources/page.tsx` is a static route, so it wins over `[category]`. Metadata: title `Data sources`, a unique description, canonical `${siteUrl()}/data-sources/`, `buildOpenGraph` / `buildTwitter`.

Constraint to resolve first: water-footprint avoids build-time BFF access with a dynamic segment (`dynamicParams = true`, slug excluded from `generateStaticParams`). A static route has no such escape: Next.js would prerender it during `next build` and call the BFF there. The implementation therefore starts with a short spike (tasks section 5, first task) with this preference order:

1. **Preferred:** keep the route on-demand and cache the data at the fetch layer: `export const dynamic = 'force-dynamic'` with the helper's `next: { revalidate: 86400 }`, if Next 16.4 honors the explicit fetch revalidation inside a dynamic route (Data Cache) and keeps serving the stale entry when revalidation fails. Result: the build never touches the BFF, the BFF is hit at most once per day per cache region, and failure behavior matches the retry/stale-if-error requirement.
2. If (1) does not give stale-if-error, restructure so the page lives under a dynamic segment with `generateStaticParams` returning `[]` (the proven water-footprint strategy) and a single allowed value that resolves to `/data-sources/`, with every other value a real 404.
3. Rejected: fetching at build time (`next build` would then depend on the BFF; CI builds have none).

Whichever path is taken, the spec contract is the same (build never calls the BFF; first request generates; daily freshness; failed refresh does not replace good content; unreachable BFF with nothing cached shows `error.tsx`, not a cached empty page). The coder records the finding in the task and reports it; if neither path meets the contract, stop and ask. This is open question 1.

Graceful state: the page distinguishes "BFF unavailable" from "no sources". Unavailable follows the water-footprint pattern (the helper throws, `error.tsx` renders, nothing is cached). An empty `providers` array (the expected state today) hides the "Live data providers" section entirely, with no empty-state message, and the introduction only describes rendered sections; `datasets` is always expected to be non-empty while water-footprint exists.

Page structure: `<main id="main-content" tabIndex={-1}>`, `<h1>Data sources</h1>`, intro paragraph (describing only the rendered sections), then `<section aria-labelledby>` "Live data providers" (only when `providers` is non-empty) and "Cited publications". Per live provider: name (link to `sourceUrl`), description, license, `Last updated <time dateTime>` plus basis wording ("by the provider" / "retrieved by us on"). Per dataset: name, description and a list of publications: citation as an external link (`rel="noopener noreferrer"`), "Published <publishedYear>", `entryCount` entries, and, when `publisher` is present, "Republished by" followed by `SourceAttribution`. Categories render as links to the category pages (titles from `getCategoryTitle`). Live-provider dates formatted in UTC with `Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })` for deterministic server output. Colors only from tokens (`text-fg`, `text-fg-secondary`, `text-fg-muted`, `text-accent hover:text-accent-hover underline`, `border-line-strong`, `bg-surface-raised`, `bg-well` for icon/chips if used), focus ring pattern already used by links in the codebase.

### 5.3 Shared attribution component

`apps/web/src/components/SourceAttribution.tsx` (Server-compatible, no state): the single "<a>{provider}</a> (<license>)" fragment for a `DataSourcePublisher`-shaped value (`Pick<DataSourceAttribution, 'provider' | 'license' | 'sourceUrl'>`, so a full `DataSourceAttribution` from a future `meta.source` is assignable). It carries no lead-in, date or link; callers add their own ("via", "Republished by", "Some values are republished by", or "Data:" on a future chart). Used by (a) the per-row attribution in `WaterFootprintTable`, (b) the publications on the data sources page and (c) the water-footprint note.

### 5.4 Water-footprint attribution (per row and per section)

The products already carry the optional `publisher` (section 4), so the water-footprint page keeps its single fetch. `WaterFootprintTable`'s per-row `Attribution` adds, when `publisher` is present, "via" and a `SourceAttribution` next to the citation (citation and methodology unchanged; rows from other hosts render as before). `WaterFootprintContent` derives the distinct publishers from `products` and renders, under the table, a note "Some values are republished by <SourceAttribution>[, …]. <All data sources link>" (honest wording: only some rows are republished) with exactly one link to `/data-sources/`; with no publisher it shows only the link. Publisher names and licenses come from the API, never from web constants. Alternatives rejected: a second BFF fetch of the catalog on the water-footprint page (extra dependency and failure mode for each regeneration), and `meta` on the products response (`meta.source` is single-valued and rows differ).

### 5.5 Footer

In `layout.tsx`, a `Footer` component (`apps/web/src/components/Footer.tsx`) is rendered **inside** the existing content wrapper after `{children}`: `<div className="pb-20 lg:pb-0 lg:pl-76">{children}<Footer /></div>`. Being in the wrapper, it inherits the mobile bottom clearance (`pb-20`, so the footer is fully visible above the fixed bottom nav at the end of the scroll) and the desktop sidebar offset (`lg:pl-76`) with no new coupling. Not fixed or sticky.

Markup: `<footer>` (implicit `contentinfo`, direct child of the wrapper, not inside `main`) in the terminal style of the site brand: the site logo with `~ eco-metrics.earth` in mono accent, the tagline "Environmental data, made readable.", one link rendered as `$ cd data-sources/` (the prompt is `aria-hidden`; the link is labelled "Data sources"; one link does not justify a `nav` landmark), and a bottom line "© 2026 eco-metrics earth · by maf248". Two columns from `sm`, stacked on mobile. Link uses `LINK_CLASS_NAME` with the project focus pattern (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ring-offset-focus-offset`), rounded for the ring. Tokens only; both themes covered by tokens. The user will review it visually and may request tweaks, so the component is isolated and has no logic.

### 5.6 SEO

Sitemap gets one entry (`${base}/data-sources/`, `changeFrequency: 'monthly'`, `priority: 0.5`). JSON-LD is **not** added: there is no schema.org type that Google rewards for a list of citations, `Dataset` markup would require fields we do not publish (distribution, description per dataset URL), and the server-rendered semantic HTML (headings, lists, `<time>`) already carries the content. Revisit when real datasets are exposed.

## 6. Files

```
packages/shared/src/lib/data-sources.ts (+ export in index.ts)
apps/api/src/modules/data-sources/{data-source-contributor.ts,data-sources.service.ts,data-sources.controller.ts,data-sources.module.ts}
apps/api/src/modules/providers/owid/owid.attribution.ts   (re-export)
apps/api/src/common/publishers/publishers.ts
apps/api/src/common/publishers/resolve-publisher.ts
apps/api/src/modules/water-footprint/water-footprint.service.ts   (contributor, publisher on rows, year validation)
apps/api/src/app/app.module.ts                                    (import DataSourcesModule)
apps/web/src/lib/{bffFetch.ts,dataSources.ts,waterFootprint.ts}
apps/web/src/components/{SourceAttribution.tsx,Footer.tsx}
apps/web/src/app/data-sources/page.tsx   (final location depends on the build-independence spike)
apps/web/src/app/{layout.tsx,sitemap.ts,[category]/page.tsx}
apps/web/src/components/water-footprint/{WaterFootprintContent.tsx,WaterFootprintTable.tsx}
apps/web/e2e/{data-sources.spec.ts,a11y.spec.ts,water-footprint.spec.ts,navigation or seo spec,utils/pages.ts}
```

Test locations mirror source under `__tests__/` (API: `apps/api/__tests__/data-sources/`, `.../providers/`, `.../water-footprint/`; web: `__tests__/lib`, `__tests__/components`, `__tests__/app`).

## 7. Risks and mitigations

| Risk                                                                         | Mitigation                                                                                                                                                     |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static route would call the BFF during `next build`                          | Spike-first task with ordered options; contract fixed regardless (5.2)                                                                                         |
| `DiscoveryService` API differs in Nest 12                                    | Confirm in the first API task; manual `Reflector` form is equivalent                                                                                           |
| Contributor provider not instantiated (lazy/transient)                       | Contributors are default-scoped singletons; the aggregator ignores wrappers without an instance and a test asserts discovery finds the water-footprint service |
| New dataset row without a `(YYYY)` in its citation                           | Fail-fast at construction and a test over the real dataset                                                                                                     |
| Footer under `min-h-screen` mains pushes the footer below the first viewport | Intentional (end of scroll); verified visually and by E2E at both breakpoints                                                                                  |
| Coverage thresholds (80%) with new files                                     | Tasks include tests for every new file                                                                                                                         |
| `designTokens.test.ts` flags unused/forbidden colors                         | Only existing tokens are used; no new token                                                                                                                    |
| Snapshot churn (layout, category page)                                       | Update intentionally, diff the `.snap` files                                                                                                                   |
