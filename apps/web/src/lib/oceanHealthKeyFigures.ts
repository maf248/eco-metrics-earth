import { formatAnomaly, formatSignedWhole } from '@/lib/formatNumber';
import type {
  OceanPhData,
  OceanSeaLevelData,
  OceanSstAnomalyData,
  OceanSstDailyData,
} from '@eco-metrics/shared';

// A fixed locale, so server and client render identical text (no hydration mismatch).
const LOCALE = 'en-US';

const temperatureFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const phFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dayFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const monthFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const shortMonthFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const DAY_MS = 24 * 60 * 60 * 1000;
/** Mean length of a calendar year in days, for "in N years". */
const DAYS_PER_YEAR = 365.25;
/** The World entity of the annual anomaly payload. */
const WORLD_CODE = 'OWID_WRL';

const utc = (isoDate: string): Date => new Date(`${isoDate}T00:00:00Z`);
const yearOf = (isoDate: string): number => Number(isoDate.slice(0, 4));

/** Absolute temperature with two decimals: `20.88`. */
export function formatTemperature(value: number): string {
  return temperatureFormatter.format(value);
}

/** An ISO calendar date as `22 Nov 2026`, read in UTC (no timezone drift). */
export function formatDayMonthYear(isoDate: string): string {
  const parts = dayFormatter.formatToParts(utc(isoDate));
  const part = (type: string): string => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('day')} ${part('month')} ${part('year')}`;
}

/** An ISO calendar date as its month and year, in UTC: `February 2025`. */
export function formatMonthYear(isoDate: string): string {
  return monthFormatter.format(utc(isoDate));
}

/** An ISO calendar date as its short month and year, in UTC: `Feb 2025`. */
export function formatShortMonthYear(isoDate: string): string {
  return shortMonthFormatter.format(utc(isoDate));
}

/** A dated value ready to print. */
interface DatedText {
  date: string;
  dateText: string;
}

export interface SstFigure {
  latest: DatedText & { sst: string; anomaly: string; preliminary: boolean };
  /** The daily record, or `undefined` when the latest day is the record itself. */
  record?: DatedText & { sst: string };
}

/**
 * The latest daily sea surface temperature with its signed anomaly and the daily record of the
 * series. Pure, so server and client agree.
 */
export function deriveSstFigure({
  latest,
  record,
}: Pick<OceanSstDailyData, 'latest' | 'record'>): SstFigure {
  return {
    latest: {
      date: latest.date,
      dateText: formatDayMonthYear(latest.date),
      sst: formatTemperature(latest.sst),
      anomaly: formatAnomaly(latest.anomaly),
      preliminary: latest.status === 'preliminary',
    },
    record:
      record.date === latest.date
        ? undefined
        : {
            date: record.date,
            dateText: formatDayMonthYear(record.date),
            sst: formatTemperature(record.sst),
          },
  };
}

export interface WarmingFigure {
  /** The last year with a World value, and that value, signed. */
  year: number;
  anomaly: string;
  /** First year with a World value. */
  firstYear: number;
  /** The warmest year, or `undefined` when it is `year` itself. */
  warmest?: { year: number; anomaly: string };
}

/**
 * The World's latest annual sea surface temperature anomaly and the warmest year of the series
 * (a tie names the most recent year). `undefined` when the World has no value.
 */
export function deriveWarmingFigure(
  data: Pick<OceanSstAnomalyData, 'startYear' | 'regions'>,
): WarmingFigure | undefined {
  const world = data.regions.find(({ code }) => code === WORLD_CODE);
  const present = (world?.mean ?? [])
    .map((value, index) => ({ year: data.startYear + index, value }))
    .filter((entry): entry is { year: number; value: number } => entry.value !== null);
  if (present.length === 0) {
    return undefined;
  }

  const last = present[present.length - 1];
  const warmest = present.reduce((best, entry) => (entry.value >= best.value ? entry : best));
  return {
    year: last.year,
    anomaly: formatAnomaly(last.value),
    firstYear: present[0].year,
    warmest:
      warmest.year === last.year
        ? undefined
        : { year: warmest.year, anomaly: formatAnomaly(warmest.value) },
  };
}

export interface SeaLevelRise {
  first: DatedText & { monthText: string };
  latest: DatedText & { monthText: string };
  /** Latest minus first observation, whole millimetres. */
  changeMm: number;
  /** The same change in whole centimetres, signed: `+10`. */
  changeCmText: string;
  /** Whole years between the two observations. */
  years: number;
}

/**
 * The change in global mean sea level from the earliest to the latest observation of any
 * mission. On a shared earliest date the mission listed first wins; on a shared latest date, the
 * one listed last (the newest mission).
 */
export function deriveSeaLevelRise({
  missions,
}: Pick<OceanSeaLevelData, 'missions'>): SeaLevelRise {
  const firsts = missions.map(({ dates, values }) => ({ date: dates[0], value: values[0] }));
  const lasts = missions.map(({ dates, values }) => ({
    date: dates[dates.length - 1],
    value: values[values.length - 1],
  }));
  const first = firsts.reduce((best, entry) => (entry.date < best.date ? entry : best));
  const latest = lasts.reduce((best, entry) => (entry.date >= best.date ? entry : best));

  const changeMm = Math.round(latest.value - first.value);
  const dated = ({ date }: { date: string }) => ({
    date,
    dateText: formatDayMonthYear(date),
    monthText: formatShortMonthYear(date),
  });
  return {
    first: dated(first),
    latest: dated(latest),
    changeMm,
    changeCmText: formatSignedWhole(Math.round(changeMm / 10)),
    years: Math.round(
      (utc(latest.date).getTime() - utc(first.date).getTime()) / DAY_MS / DAYS_PER_YEAR,
    ),
  };
}

export interface AcidityFigure {
  /** Change in hydrogen ion concentration, signed whole percent: `+17`. */
  percentText: string;
  /** `true` when the water became more acidic (pH fell). */
  moreAcidic: boolean;
  first: { year: number; ph: string };
  latest: { year: number; ph: string };
}

/**
 * The change in acidity between the first and the latest yearly pH averages. pH is the negative
 * decimal logarithm of the hydrogen ion concentration, so a fall of `d` multiplies it by `10^d`.
 * `undefined` when there is no yearly average.
 */
export function deriveAcidityFigure({
  dates,
  yearlyAverage,
}: Pick<OceanPhData, 'dates' | 'yearlyAverage'>): AcidityFigure | undefined {
  const present = yearlyAverage
    .map((value, index) => ({ date: dates[index], value }))
    .filter((entry): entry is { date: string; value: number } => entry.value !== null);
  if (present.length === 0) {
    return undefined;
  }

  const first = present[0];
  const latest = present[present.length - 1];
  const percent = Math.round((10 ** (first.value - latest.value) - 1) * 100);
  return {
    percentText: formatSignedWhole(percent),
    moreAcidic: latest.value < first.value,
    first: { year: yearOf(first.date), ph: phFormatter.format(first.value) },
    latest: { year: yearOf(latest.date), ph: phFormatter.format(latest.value) },
  };
}
