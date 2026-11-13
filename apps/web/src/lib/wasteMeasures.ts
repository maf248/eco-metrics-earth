import type { ChartRamp } from '@/components/charts/chartTokens';
import { formatShare } from '@/lib/formatNumber';
import type { WasteCompositionGroup, WasteCountry, WasteTreatmentGroup } from '@eco-metrics/shared';

/** Treatment groups in display (and palette) order. */
export const WASTE_TREATMENT_GROUPS: readonly WasteTreatmentGroup[] = [
  'recycling',
  'composting',
  'incineration',
  'sanitaryLandfill',
  'otherLandfill',
  'openDump',
  'uncollected',
  'other',
];

export const WASTE_TREATMENT_LABELS: Record<WasteTreatmentGroup, string> = {
  recycling: 'Recycling',
  composting: 'Composting',
  incineration: 'Incineration',
  sanitaryLandfill: 'Sanitary landfill',
  otherLandfill: 'Other landfill',
  openDump: 'Open dump',
  uncollected: 'Uncollected',
  other: 'Other',
};

/** Composition groups in display (and palette) order. */
export const WASTE_COMPOSITION_GROUPS: readonly WasteCompositionGroup[] = [
  'foodOrganic',
  'paperCardboard',
  'plastic',
  'glass',
  'metal',
  'other',
];

export const WASTE_COMPOSITION_LABELS: Record<WasteCompositionGroup, string> = {
  foodOrganic: 'Food and organic',
  paperCardboard: 'Paper and cardboard',
  plastic: 'Plastic',
  glass: 'Glass',
  metal: 'Metal',
  other: 'Other',
};

/** The measures the map colors countries by. */
export type WasteMeasure = 'recycled' | 'recycledOrComposted' | 'uncollected' | 'perPerson';

export const DEFAULT_WASTE_MEASURE: WasteMeasure = 'recycled';

interface MeasureDefinition {
  value: WasteMeasure;
  /** Label of the selector and the table column. */
  label: string;
  /** The selector's label below `sm`, where the full one would wrap. */
  shortLabel?: string;
  /** Title of the map card. */
  title: string;
  /** Names the legend for assistive technology. */
  legendLabel: string;
  /** Sequential ramp of the map: greens where more is better, heat where it is not. */
  ramp: ChartRamp;
  /** Upper bounds of the first four classes; the fifth is open. */
  breaks: readonly [number, number, number, number];
  /** Legend labels of the five classes, low to high. */
  classLabels: readonly [string, string, string, string, string];
}

const PERCENT_BREAKS = [10, 25, 40, 60] as const;
const PERCENT_LABELS = ['< 10%', '10–25%', '25–40%', '40–60%', '≥ 60%'] as const;

export const WASTE_MEASURES: readonly MeasureDefinition[] = [
  {
    value: 'recycled',
    label: 'Recycled',
    title: 'Share of municipal waste recycled',
    legendLabel: 'Legend: share of waste recycled',
    ramp: 'good',
    breaks: PERCENT_BREAKS,
    classLabels: PERCENT_LABELS,
  },
  {
    value: 'recycledOrComposted',
    label: 'Recycled or composted',
    shortLabel: 'Recycled + composted',
    title: 'Share of municipal waste recycled or composted',
    legendLabel: 'Legend: share of waste recycled or composted',
    ramp: 'good',
    breaks: PERCENT_BREAKS,
    classLabels: PERCENT_LABELS,
  },
  {
    value: 'uncollected',
    label: 'Uncollected',
    title: 'Share of municipal waste not collected',
    legendLabel: 'Legend: share of waste not collected',
    ramp: 'heat',
    breaks: [1, 5, 15, 30],
    classLabels: ['< 1%', '1–5%', '5–15%', '15–30%', '≥ 30%'],
  },
  {
    value: 'perPerson',
    label: 'Per person',
    title: 'Municipal waste per person per day, 2022 (kg)',
    legendLabel: 'Legend: kilograms of waste per person per day',
    ramp: 'heat',
    breaks: [0.4, 0.7, 1, 1.5],
    classLabels: ['< 0.4 kg', '0.4–0.7 kg', '0.7–1.0 kg', '1.0–1.5 kg', '≥ 1.5 kg'],
  },
];

export function measureDefinition(measure: WasteMeasure): MeasureDefinition {
  const found = WASTE_MEASURES.find(({ value }) => value === measure);
  if (!found) {
    throw new Error(`Unknown waste measure ${measure}`);
  }
  return found;
}

/** What a country reports for one measure. `value` is `null` when it is not reported. */
interface MeasureReading {
  value: number | null;
  /** The data year, or `2022 estimate` for waste per person; `null` without a value. */
  yearLabel: string | null;
  /** The part of the measure the country does not report, said in words; `null` if none. */
  note: string | null;
}

const NOT_REPORTED: MeasureReading = { value: null, yearLabel: null, note: null };

/** Sum of the two parts at the precision of the data (0.1), free of float noise. */
const sumTenths = (a: number, b: number): number => Math.round((a + b) * 10) / 10;

function unreportedPart(recycling: number | null, composting: number | null): string | null {
  if (recycling === null) {
    return 'Recycling is not reported';
  }
  return composting === null ? 'Composting is not reported' : null;
}

/**
 * Reads a measure for a country. A share the source does not report is `null`, never 0; the
 * recycled-or-composted measure is the sum of the reported parts and names the part that is
 * not reported.
 */
export function readMeasure(country: WasteCountry, measure: WasteMeasure): MeasureReading {
  if (measure === 'perPerson') {
    return {
      value: country.generation.kgPerPersonPerDay2022,
      yearLabel: '2022 estimate',
      note: null,
    };
  }

  const { treatment } = country;
  if (!treatment) {
    return NOT_REPORTED;
  }
  const { recycling, composting, uncollected } = treatment.shares;
  const yearLabel = String(treatment.year);

  switch (measure) {
    case 'recycled':
      return recycling === null ? NOT_REPORTED : { value: recycling, yearLabel, note: null };
    case 'uncollected':
      return uncollected === null ? NOT_REPORTED : { value: uncollected, yearLabel, note: null };
    case 'recycledOrComposted': {
      if (recycling === null && composting === null) {
        return NOT_REPORTED;
      }
      const note = unreportedPart(recycling, composting);
      return { value: sumTenths(recycling ?? 0, composting ?? 0), yearLabel, note };
    }
  }
}

/** A measure value as text: percent with one decimal, or kilograms with two. */
export function formatMeasureValue(measure: WasteMeasure, value: number): string {
  return measure === 'perPerson' ? `${value.toFixed(2)} kg` : `${formatShare(value)}%`;
}

/** The most countries the comparison bars hold: more would make them unreadable. */
export const MAX_COMPARED_COUNTRIES = 10;

/** The countries the comparison starts with, leaving room to add more before the limit. */
export const DEFAULT_COMPARED_COUNTRIES = 5;

/** Codes of the most populous countries that report treatment, most populous first. */
export function defaultComparisonCodes(countries: readonly WasteCountry[]): string[] {
  return countries
    .filter(({ treatment }) => treatment !== undefined)
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
    .slice(0, DEFAULT_COMPARED_COUNTRIES)
    .map(({ code }) => code);
}

export type WasteSortOrder = 'descending' | 'ascending';

export interface WasteSort {
  measure: WasteMeasure;
  order: WasteSortOrder;
}

type RankedEntry = Omit<WasteRankedRow, 'rank'>;

interface WasteRankedRow {
  /**
   * Competition rank (1, 2, 2, 4) of the descending order by the sort measure, so a country keeps
   * its rank whichever end is shown first; `null` when it does not report the measure.
   */
  rank: number | null;
  country: WasteCountry;
  /** One reading per measure, in `WASTE_MEASURES` order. */
  readings: MeasureReading[];
}

const byName = (a: RankedEntry, b: RankedEntry): number =>
  a.country.name.localeCompare(b.country.name, 'en');

/**
 * Every country sorted by one measure. Countries that do not report it go last, unranked, in
 * name order, whichever end is shown first; equal values are listed by name.
 */
export function rankWasteCountries(
  countries: readonly WasteCountry[],
  { measure, order }: WasteSort,
): WasteRankedRow[] {
  const keyIndex = WASTE_MEASURES.findIndex(({ value }) => value === measure);
  const entries: RankedEntry[] = countries.map((country) => ({
    country,
    readings: WASTE_MEASURES.map(({ value }) => readMeasure(country, value)),
  }));
  const value = (entry: RankedEntry): number => entry.readings[keyIndex].value ?? 0;
  const reported = (entry: RankedEntry): boolean => entry.readings[keyIndex].value !== null;

  const descending = entries.filter(reported).sort((a, b) => value(b) - value(a) || byName(a, b));
  // The rank of the first of the equal values: 1, 2, 2, 4.
  const ranked = descending.map((entry) => ({
    ...entry,
    rank: descending.findIndex((other) => value(other) === value(entry)) + 1,
  }));
  const shown =
    order === 'ascending'
      ? [...ranked].sort((a, b) => value(a) - value(b) || byName(a, b))
      : ranked;
  const unranked = entries
    .filter((entry) => !reported(entry))
    .sort(byName)
    .map((entry) => ({ ...entry, rank: null }));
  return [...shown, ...unranked];
}
