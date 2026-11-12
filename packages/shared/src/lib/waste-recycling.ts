import type { CountryEntity } from './country-series';

/**
 * What happens to a country's municipal waste. `uncollected` is waste that is
 * never collected; `other` holds what the source did not separate (other
 * treatments, mechanical-biological treatment and "unaccounted for").
 */
export type WasteTreatmentGroup =
  | 'recycling'
  | 'composting'
  | 'incineration'
  | 'sanitaryLandfill'
  | 'otherLandfill'
  | 'openDump'
  | 'uncollected'
  | 'other';

/** What a country's municipal waste is made of. */
export type WasteCompositionGroup =
  'foodOrganic' | 'paperCardboard' | 'plastic' | 'glass' | 'metal' | 'other';

/** Municipal waste generated: a 2022 estimate and projections to 2050. */
export interface WasteGeneration {
  /** Kilograms of municipal waste per person per day in 2022 (harmonized estimate). */
  kgPerPersonPerDay2022: number;
  /** Tonnes of municipal waste per year. */
  tonnes2022: number;
  tonnes2030: number;
  tonnes2040: number;
  tonnes2050: number;
  /** Year of the measurement the estimate is based on; `null` when none is reported. */
  reportedYear: number | null;
}

/**
 * Shares in percent of the reported groups, which sum to 100. A group the
 * source does not report is `null`, never 0: the source leaves what it did not
 * separate inside "other" or "unaccounted for".
 */
export interface WasteTreatment {
  /** Year of the data: the publication year where the source has no measurement date. */
  year: number;
  shares: Record<WasteTreatmentGroup, number | null>;
}

/** Material composition, with the same rules as `WasteTreatment`. */
export interface WasteComposition {
  year: number;
  shares: Record<WasteCompositionGroup, number | null>;
}

/** One country of the dataset. */
export interface WasteCountry extends CountryEntity {
  /** Population in 2022. */
  population: number | null;
  generation: WasteGeneration;
  /** Absent when the country reports no treatment. */
  treatment?: WasteTreatment;
  /** Absent when the country reports no composition. */
  composition?: WasteComposition;
}

/** The generation sums over every country of the dataset (no measurement year). */
export type WasteWorldGeneration = Omit<WasteGeneration, 'reportedYear'>;

/**
 * Share of municipal waste recycled, weighted by 2022 tonnes over the countries
 * that report recycling. Countries that do not report it are not counted as zero.
 */
export interface WasteRecyclingSummary {
  /** Weighted share recycled, in percent. */
  sharePercent: number;
  /** Number of countries that report recycling. */
  countries: number;
  /** Their share of the world's 2022 population, in percent. */
  populationSharePercent: number;
}

/** The published dataset the payload comes from, for citations and structured data. */
export interface WasteDatasetInfo {
  /** Title of the publication. */
  title: string;
  /** The publisher's suggested citation. */
  citation: string;
}

/** Payload of `GET /api/v1/waste-recycling`. */
export interface WasteRecyclingData {
  dataset: WasteDatasetInfo;
  world: {
    generation: WasteWorldGeneration;
    recycling: WasteRecyclingSummary;
  };
  /** Sorted by name. */
  countries: WasteCountry[];
}
