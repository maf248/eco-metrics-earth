import type { CountryEntity, DatasetIdentity } from './country-series';
import type { DataSourceOrigin } from './data-sources';

/**
 * The electricity sources of the energy mix, in their fixed order. This is the
 * one definition of the sources and of their order: the API builder, the web
 * helpers and the chart palette all derive from it, and a series keeps its
 * position (and so its colour) whatever the data.
 *
 * `bioenergyOther` is bioenergy plus other renewables excluding bioenergy
 * (geothermal, wave and tidal), summed by the API.
 */
export const ENERGY_SOURCE_IDS = [
  'coal',
  'gas',
  'oil',
  'nuclear',
  'hydro',
  'wind',
  'solar',
  'bioenergyOther',
] as const;

/** One electricity source of the mix. */
export type EnergySourceId = (typeof ENERGY_SOURCE_IDS)[number];

/** The renewable subset of {@link ENERGY_SOURCE_IDS}. */
export const RENEWABLE_SOURCE_IDS = [
  'hydro',
  'wind',
  'solar',
  'bioenergyOther',
] as const satisfies readonly EnergySourceId[];

/**
 * Electricity generation of one entity (a country or the world) by source,
 * year-aligned: index `i` of every array is the year
 * `EnergySourcesData.startYear + i`. Values are terawatt-hours rounded to 2
 * decimals; `null` means the provider reports no value for that source and year
 * (never zero). The data covers electricity, not primary energy, from 2000.
 *
 * Shares are not on the wire: the web derives them from `generation`.
 */
export interface EnergySourcesEntity extends CountryEntity {
  generation: Record<EnergySourceId, (number | null)[]>;
}

/** Payload of `GET /api/v1/energy-sources`: every country plus World in one response. */
export interface EnergySourcesData {
  /** First year of every entity array (2000). */
  startYear: number;
  /** Latest year with real generation. */
  endYear: number;
  /** Display unit of the generation values (`TWh`). */
  unit: string;
  /** Dataset the values come from, taken from the provider's indicator metadata. */
  dataset: DatasetIdentity;
  /** Ember, which produced every value served. */
  origin: DataSourceOrigin;
  /** World first, then countries ordered by name. */
  entities: EnergySourcesEntity[];
}
