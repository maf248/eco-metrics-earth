# Proposal

## Why

Google's Rich Results Test reports the sources listed in `isBasedOn` of every dataset page as
Dataset items of their own, because they are typed `Dataset`. A standalone Dataset needs a
`description` of 50 to 5000 characters, so each source shows as an invalid item with one
critical issue (missing `description`) and two warnings (missing `creator` and `license`).
The page's own Dataset stays valid, but the report is red on `/co2-emissions/`,
`/energy-sources/`, `/global-temperature/` and `/waste-recycling/`.

The sources are datasets published by other sites (Our World in Data, Ember, Copernicus,
the Met Office, the World Bank). Google asks to mark up as `Dataset` only what a page
publishes, so the sources should not become Dataset Search candidates of this site, and
giving them a description would duplicate other sites' datasets.

## What Changes

- Every entry of `isBasedOn` is declared as a schema.org `CreativeWork` (the parent type of
  `Dataset`, and a type `isBasedOn` accepts) with the same properties it has today: `name`,
  `publisher`, `url`, and `version` or `citation` when known.
- One shared helper in `apps/web/src/lib/datasetJsonLd.ts` builds those entries, so the
  four category builders cannot drift back to `Dataset`.
- The page's own Dataset is unchanged.

## Non-Goals

- No `Dataset` for `/water-footprint/` and no structured data for `/data-sources/`.
- No new properties on the page's Dataset (`distribution`, `sameAs`, `funder`).

## Impact

- `apps/web/src/lib/datasetJsonLd.ts` and the CO2, energy, temperature and waste builders.
- Their unit tests and the E2E specs that read `isBasedOn`.
- Specs: `dataset-structured-data` (added requirement for the sources; the generic builder
  requirement no longer says the CO2 output is exactly the one before the extraction, since
  its source type changes), `energy-sources-page` (the Ember source is no longer described
  as a `Dataset`).
