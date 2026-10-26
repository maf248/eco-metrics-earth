import { listYears } from '@/lib/yearRange';

/** True for decade years (1950, 2020...): the only ones that get a label and a tick. */
export function isDecadeYear(year: string): boolean {
  return Number(year) % 10 === 0;
}

/**
 * Category x axis for a chart of year-aligned values: every year is a category,
 * but only decades are labelled (with ticks aligned to the labels), which stays
 * readable at 375 px. `hideOverlap` still guards against collisions.
 */
export function buildYearAxis(range: { startYear: number; endYear: number }) {
  return {
    type: 'category',
    data: listYears(range).map(String),
    boundaryGap: false,
    axisTick: {
      alignWithLabel: true,
      interval: (_index: number, year: string) => isDecadeYear(year),
    },
    axisLabel: {
      hideOverlap: true,
      interval: (_index: number, year: string) => isDecadeYear(year),
    },
  };
}
