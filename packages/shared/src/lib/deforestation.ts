import type { CountryEntity, DatasetIdentity } from './country-series';
import type { DataSourceOrigin } from './data-sources';

/**
 * Forest area of one entity (a country or the world), year-aligned: index `i`
 * of every array is the year `ForestAreaData.startYear + i`. `null` means the
 * provider reports no value for that year (never zero).
 */
export interface ForestAreaEntity extends CountryEntity {
  /** Forest area in hectares (whole numbers). */
  area: (number | null)[];
  /** Forest area as a percentage of land area, rounded to 2 decimals. */
  share: (number | null)[];
}

/** Payload of `GET /api/v1/deforestation/forest-area`: every country plus World. */
export interface ForestAreaData {
  /** First year of every entity array (1990). */
  startYear: number;
  /** Latest year with a value. */
  endYear: number;
  /** Display units of the two measures (`hectares`, `% of land area`). */
  units: { area: string; share: string };
  /** Dataset the values come from, taken from the area indicator's metadata. */
  dataset: DatasetIdentity;
  /** FAO Global Forest Resources Assessment 2025, which produced every value served. */
  origin: DataSourceOrigin;
  /** World first, then countries ordered by name. */
  entities: ForestAreaEntity[];
}

/**
 * The seven dominant drivers of tree cover loss, in their stacking order
 * (bottom to top), as the source lists them. This is the one definition of the
 * drivers and of their order: the API builder, the web helpers and the chart
 * palette all derive from it.
 */
export const TREE_COVER_LOSS_DRIVER_IDS = [
  'permanentAgriculture',
  'hardCommodities',
  'settlementsInfrastructure',
  'shiftingCultivation',
  'logging',
  'wildfire',
  'otherNaturalDisturbances',
] as const;

/** One dominant driver of tree cover loss. */
export type TreeCoverLossDriverId = (typeof TREE_COVER_LOSS_DRIVER_IDS)[number];

/** A driver with its source label, served by the API so the web never hardcodes names. */
export interface TreeCoverLossDriver {
  id: TreeCoverLossDriverId;
  /** Source label, e.g. `Hard commodities (mining and energy)`. */
  name: string;
}

/**
 * Hectares of tree cover lost per year by driver, year-aligned from
 * `TreeCoverLossData.startYear`; `null` means no value (not 0).
 */
export type TreeCoverLossEntity = CountryEntity & Record<TreeCoverLossDriverId, (number | null)[]>;

/** Payload of `GET /api/v1/deforestation/tree-cover-loss`: every country plus World. */
export interface TreeCoverLossData {
  /** First year of every entity array (2001). */
  startYear: number;
  /** Latest year with a value. */
  endYear: number;
  /** Unit of the loss values (`hectares`). */
  unit: string;
  /** Dataset the values come from, taken from the provider's indicator metadata. */
  dataset: DatasetIdentity;
  /** World Resources Institute and Google DeepMind (Global Forest Watch). */
  origin: DataSourceOrigin;
  /** The seven drivers in stacking order. */
  drivers: TreeCoverLossDriver[];
  /** World first, then countries ordered by name. */
  entities: TreeCoverLossEntity[];
}
