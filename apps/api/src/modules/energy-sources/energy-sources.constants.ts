import { DataSourceOrigin, ECO_CATEGORIES, EcoCategory, EnergySourceId } from '@eco-metrics/shared';

export const ENERGY_SOURCES_CATEGORY: EcoCategory = ECO_CATEGORIES.ENERGY_SOURCES;

/**
 * Electricity generation (TWh) by source, for every country and the world. The
 * chart opens on its chart tab, so the `country` filter is honoured without a
 * `tab` parameter. Do not use the former slug `electricity-prod-source-stacked`:
 * it redirects to an OWID Explorer, whose CSV contract is not guaranteed and
 * whose column is zero-filled for stacking (missing data would become zeros).
 */
export const ENERGY_GENERATION_CHART = {
  slug: 'electricity-production-by-source',
  /** Provider column (short name) and indicator ID of every raw generation series. */
  columns: {
    coal: { column: 'coal_generation__twh', indicatorId: 1295503 },
    gas: { column: 'gas_generation__twh', indicatorId: 1295509 },
    oil: { column: 'oil_generation__twh', indicatorId: 1295524 },
    nuclear: { column: 'nuclear_generation__twh', indicatorId: 1295521 },
    hydro: { column: 'hydro_generation__twh', indicatorId: 1295516 },
    wind: { column: 'wind_generation__twh', indicatorId: 1295559 },
    solar: { column: 'solar_generation__twh', indicatorId: 1295552 },
    bioenergy: { column: 'bioenergy_generation__twh', indicatorId: 1295498 },
    otherRenewables: {
      column: 'other_renewables_excluding_bioenergy_generation__twh',
      indicatorId: 1295525,
    },
  },
  /** The indicator whose metadata names the dataset and carries the provider's timestamp. */
  metadataIndicatorId: 1295503,
} as const;

/** The provider columns, in the order they are requested. */
export type EnergyRawColumn = keyof typeof ENERGY_GENERATION_CHART.columns;

/** How the eight served sources map to the provider columns (the last one sums two). */
export const ENERGY_SOURCE_COLUMNS: Record<EnergySourceId, readonly EnergyRawColumn[]> = {
  coal: ['coal'],
  gas: ['gas'],
  oil: ['oil'],
  nuclear: ['nuclear'],
  hydro: ['hydro'],
  wind: ['wind'],
  solar: ['solar'],
  bioenergyOther: ['bioenergy', 'otherRenewables'],
};

/**
 * First year served, and the first ever requested: OWID's series is Ember's (CC BY 4.0) from
 * 2000; earlier values are the Energy Institute's (all rights reserved). See
 * docs/data-sources/energy-sources.md before extending it back.
 */
export const ENERGY_START_YEAR = 2000;

/** Generation is served in terawatt-hours, rounded to two decimals. */
export const ENERGY_DECIMALS = 2;
export const ENERGY_UNIT = 'TWh';

/**
 * The producer of every value served: the single definition for the catalog and `data.origin`.
 * European values may come from Ember's sibling dataset (same producer, licence and credit).
 */
export const ENERGY_ORIGIN: DataSourceOrigin = {
  producer: 'Ember',
  title: 'Yearly Electricity Data',
  url: 'https://ember-energy.org/data/yearly-electricity-data/',
  license: { name: 'CC BY 4.0', url: 'https://ember-energy.org/creative-commons/' },
};
