# Proposal

## Why

Waste & Recycling is the first category in the navigation and still a "coming soon"
placeholder. The World Bank's What a Waste 3.0 country dataset (March 2026, CC BY 4.0)
covers it well: how much municipal waste each country generates, what happens to it
(recycled, composted, incinerated, landfilled, dumped or left uncollected) and what it is
made of, for 217 countries, with projections to 2050. It is commercial-safe, unlike the
waste-management chart republished by Our World in Data, whose underlying study is not
openly licensed, and unlike the UN food-waste series, whose terms are not an open license.

## What Changes

- A static World Bank dataset bundled with the API, generated from the published workbook by
  a repeatable script, and served at `GET /api/v1/waste-recycling` with its attribution and
  update date.
- The Waste & Recycling page gets live content:
  - Key figures: world municipal waste generated in 2022 (total and per person), its
    projection to 2050, and the share recycled among the countries that report it.
  - A world map with a measure selector (share recycled; recycled or composted; share
    uncollected; waste per person), with the data year, and a searchable table of every
    country below it. A share the source does not report shows as "not reported", never as
    0: the source leaves unseparated destinations inside "other" or "unaccounted for".
  - What happens to the waste: stacked bars comparing a default set of countries, with a
    country search to add and remove them.
  - What the waste is made of: stacked bars of material composition for the same countries.
  - Projected waste generation to 2050 for the world or a chosen country.
  - Attribution to the World Bank with license and update date, and `Dataset` structured
    data.
- The category becomes live everywhere through the existing configuration: home card,
  sitemap entry, indexable page, skeleton, live meta description and keyword title.
- The data sources catalog can declare the license of a cited publication that has no
  republisher, and `/data-sources/` shows it, so the World Bank entry carries CC BY 4.0.

## Non-Goals

- No Our World in Data, UN or OECD data in this category (licensing, see Why).
- No food waste block, no methane from waste, no plastic-specific recycling series.
- No city-level data (the dataset also has 262 cities).
- No year-by-year history: the dataset is one snapshot per country plus projections.
- No automatic refresh: a new World Bank release is ingested by re-running the script.

## Capabilities

### New Capabilities

- `waste-recycling-api`: the bundled World Bank dataset, its generation, the endpoint and
  its catalog entry.
- `waste-recycling-page`: the content of the Waste & Recycling page.

### Modified Capabilities

- `home-page`: the live categories listed now include Waste & Recycling.
- `sitemap`: the sitemap lists five live categories.
- `page-metadata`: Waste & Recycling leaves the placeholder descriptions.
- `static-category-pages`: one more registered category, seven placeholders.
- `category-page-registry`: the registry has five entries.
- `shared-types`: a cited publication may declare its own license.
- `data-sources-api`: publications without a republisher carry their license.
- `data-sources-page`: a publication's license is shown next to it.

## Impact

- New `packages/shared/src/lib/waste-recycling.ts` (wire types), optional `license` on
  `DataSourcePublication`.
- New API module `apps/api/src/modules/waste-recycling/` with its committed JSON dataset.
- New `scripts/generate-waste-recycling-data.mjs` and a pinned root dev dependency to read
  the `.xlsx` workbook.
- Web: `src/lib/wasteRecycling.ts`, `src/components/waste-recycling/`, the registry,
  skeleton, metadata, home summary and data sources page.
- Design system: two new chart palettes (waste treatment, waste composition).
- Tests: API, shared, web unit tests and E2E (no live provider is involved).
- Docs: `docs/design-system.md`, `AGENTS.md`, READMEs, `ROADMAP.md` (coverage matrix).
