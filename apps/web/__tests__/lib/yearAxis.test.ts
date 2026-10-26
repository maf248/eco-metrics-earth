import { buildYearAxis, isDecadeYear } from '@/lib/yearAxis';

type Axis = {
  type: string;
  data: string[];
  boundaryGap: boolean;
  axisTick: { alignWithLabel: boolean; interval: (index: number, year: string) => boolean };
  axisLabel: { hideOverlap: boolean; interval: (index: number, year: string) => boolean };
};

describe('isDecadeYear', () => {
  it.each([
    ['1950', true],
    ['2020', true],
    ['1951', false],
    ['2025', false],
  ])('should say %s is a decade year: %s', (year, expected) => {
    expect(isDecadeYear(year)).toBe(expected);
  });
});

describe('buildYearAxis', () => {
  const axis = buildYearAxis({ startYear: 1948, endYear: 1952 }) as Axis;

  it('should keep every year as a category', () => {
    expect(axis.type).toBe('category');
    expect(axis.data).toEqual(['1948', '1949', '1950', '1951', '1952']);
    expect(axis.boundaryGap).toBe(false);
  });

  it('should label and tick only decade years', () => {
    const labelled = axis.data.filter((year, index) => axis.axisLabel.interval(index, year));
    const ticked = axis.data.filter((year, index) => axis.axisTick.interval(index, year));

    expect(labelled).toEqual(['1950']);
    expect(ticked).toEqual(labelled);
  });

  it('should keep the overlap guard and align ticks with labels', () => {
    expect(axis.axisLabel.hideOverlap).toBe(true);
    expect(axis.axisTick.alignWithLabel).toBe(true);
  });
});
