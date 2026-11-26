import {
  buildOceanSstDailyOption,
  climatologyLabel,
  highlightedYears,
} from '@/lib/oceanSstDailyChartOption';
import type { OceanSstDailyData } from '@eco-metrics/shared';

import { findColorStrings } from '../fixtures/colorStrings';
import { OCEAN_SST_DAILY_FIXTURE } from '../fixtures/oceanHealth';

interface Series {
  name: string;
  data: (number | null)[];
  muted?: boolean;
  silent?: boolean;
  z: number;
  lineStyle: { type?: string; width: number };
  showSymbol: boolean;
  connectNulls: boolean;
}

interface Option {
  aria: { label: { description: string } };
  legend: { data: string[] };
  tooltip: { formatter: (params: { dataIndex: number }[]) => string };
  xAxis: {
    data: string[];
    axisLabel: { interval: (i: number, l: string) => boolean; formatter: (l: string) => string };
    axisTick: { interval: (i: number, l: string) => boolean };
  };
  series: Series[];
  grid: { bottom: number };
  media: unknown[];
}

const build = (data: OceanSstDailyData = OCEAN_SST_DAILY_FIXTURE) =>
  buildOceanSstDailyOption(data) as unknown as Option;

/** A payload with one 366-slot year per year from `first` to `last`. */
function manyYears(first: number, last: number, latestSlot = 99): OceanSstDailyData {
  const years = Array.from({ length: last - first + 1 }, (_, index) => ({
    year: first + index,
    values: Array.from({ length: 366 }, (_, slot) =>
      first + index === last && slot > latestSlot ? null : 20 + index / 100 + slot / 1000,
    ),
  }));
  return {
    ...OCEAN_SST_DAILY_FIXTURE,
    startYear: first,
    endYear: last,
    years,
    record: { ...OCEAN_SST_DAILY_FIXTURE.record, date: `${first + 44}-08-24` },
  };
}

describe('buildOceanSstDailyOption', () => {
  describe('one line per year', () => {
    it('should draw 47 year series plus the climatology', () => {
      const { series } = build(manyYears(1979, 2025));

      expect(series).toHaveLength(48);
      expect(series.filter(({ name }) => /^\d{4}( |$)/.test(name))).toHaveLength(47);
    });

    it('should flag every non-highlighted year muted and silent, without symbols', () => {
      const { series } = build(manyYears(1979, 2025));

      const muted = series.filter(({ muted: flag }) => flag === true);
      expect(muted).toHaveLength(45);
      expect(
        muted.every(
          ({ silent, showSymbol, z }) => silent === true && showSymbol === false && z < 3,
        ),
      ).toBe(true);
    });

    it('should not flag the highlighted years or the climatology', () => {
      const { series } = build(manyYears(1979, 2025));

      const unflagged = series.filter(({ muted }) => muted !== true).map(({ name }) => name);
      expect(unflagged).toEqual(['2025 (current year)', '2023 (record year)', '1991–2020 average']);
    });

    it('should list the highlighted series before the muted ones so they take the first palette colors', () => {
      const { series } = build(manyYears(1979, 2025));

      expect(series.slice(0, 3).every(({ muted }) => muted !== true)).toBe(true);
      expect(series.slice(3).every(({ muted }) => muted === true)).toBe(true);
    });

    it('should draw the climatology as a dashed line', () => {
      const clim = build().series.find(({ name }) => name === '1991–2020 average');

      expect(clim?.lineStyle.type).toBe('dashed');
      expect(clim?.data).toEqual(OCEAN_SST_DAILY_FIXTURE.climatology);
    });

    it('should put the highlighted lines above the climatology and the climatology above the muted ones', () => {
      const { series } = build();

      const z = (name: string) => series.find((entry) => entry.name === name)?.z ?? 0;
      expect(z('2024 (current year)')).toBeGreaterThan(z('1991–2020 average'));
      expect(z('1991–2020 average')).toBeGreaterThan(z('2022'));
    });
  });

  describe('current year', () => {
    it('should stop the current year at the latest date, with null gaps and never zeros', () => {
      const current = build().series.find(({ name }) => name === '2024 (current year)');

      expect(current?.data).toHaveLength(366);
      expect(current?.data[99]).not.toBeNull();
      expect(current?.data.slice(100).every((value) => value === null)).toBe(true);
      expect(current?.connectNulls).toBe(false);
    });
  });

  describe('record year', () => {
    it('should draw one highlighted year, named for both roles, when the record is in the current year', () => {
      const data = {
        ...OCEAN_SST_DAILY_FIXTURE,
        record: { ...OCEAN_SST_DAILY_FIXTURE.record, date: '2024-03-20' },
      };
      const { series, legend } = build(data);

      const highlighted = series.filter(
        ({ muted, name }) => muted !== true && /^\d{4} \(/.test(name),
      );
      expect(highlighted.map(({ name }) => name)).toEqual(['2024 (current and record year)']);
      expect(legend.data).toEqual(['2024 (current and record year)', '1991–2020 average']);
    });

    it('should draw two highlighted years when the record is in an earlier year', () => {
      const { series } = build();

      const highlighted = series.filter(
        ({ muted, name }) => muted !== true && /^\d{4} \(/.test(name),
      );
      expect(highlighted.map(({ name }) => name)).toEqual([
        '2024 (current year)',
        '2023 (record year)',
      ]);
    });

    it('should name the highlighted years from the payload', () => {
      expect(highlightedYears(OCEAN_SST_DAILY_FIXTURE)).toEqual({
        current: { year: 2024, name: '2024 (current year)' },
        record: { year: 2023, name: '2023 (record year)' },
      });
    });
  });

  describe('legend and tooltip', () => {
    it('should list only the highlighted series and the climatology in the legend', () => {
      expect(build().legend.data).toEqual([
        '2024 (current year)',
        '2023 (record year)',
        '1991–2020 average',
      ]);
    });

    it('should label the climatology with the baseline from the payload', () => {
      expect(climatologyLabel({ baseline: { startYear: 1981, endYear: 2010 } })).toBe(
        '1981–2010 average',
      );
    });

    it('should list the highlighted series and the average in the tooltip, not the earlier years', () => {
      const text = build().tooltip.formatter([{ dataIndex: 10 }]);

      expect(text).toContain('11 Jan');
      expect(text).toContain('2024 (current year):');
      expect(text).toContain('2023 (record year):');
      expect(text).toContain('1991–2020 average:');
      expect(text).not.toContain('2022');
    });

    it('should print values with two decimals and the unit', () => {
      const [, ...rows] = build()
        .tooltip.formatter([{ dataIndex: 0 }])
        .split('<br/>');

      expect(rows.every((row) => /: \d+\.\d{2} °C$/.test(row))).toBe(true);
    });

    it('should show No data for a day the current year has not reached', () => {
      const text = build().tooltip.formatter([{ dataIndex: 200 }]);

      expect(text).toContain('2024 (current year): No data');
      expect(text).toContain('2023 (record year): ');
      expect(text).not.toContain('2023 (record year): No data');
    });

    it('should accept a single tooltip param instead of a list', () => {
      const formatter = build().tooltip.formatter as unknown as (p: {
        dataIndex: number;
      }) => string;

      expect(formatter({ dataIndex: 0 })).toContain('1 Jan');
    });
  });

  describe('leap day', () => {
    it('should label slot 59 as 29 Feb and slot 60 as 1 Mar', () => {
      const { data } = build().xAxis;

      expect(data[59]).toBe('29 Feb');
      expect(data[60]).toBe('1 Mar');
      expect(data).toHaveLength(366);
      expect(data[365]).toBe('31 Dec');
    });

    it('should show 29 Feb with a value for a leap year and No data for a common year', () => {
      const data = {
        ...OCEAN_SST_DAILY_FIXTURE,
        years: OCEAN_SST_DAILY_FIXTURE.years.map((entry) =>
          entry.year === 2023
            ? { ...entry, values: entry.values.map((value, slot) => (slot === 59 ? null : value)) }
            : entry,
        ),
      };

      const text = build(data).tooltip.formatter([{ dataIndex: 59 }]);

      expect(text).toContain('29 Feb');
      expect(text).toMatch(/2024 \(current year\): \d+\.\d{2} °C/);
      expect(text).toContain('2023 (record year): No data');
    });
  });

  describe('month axis', () => {
    it('should label and tick only the first day of each month, with the month name', () => {
      const { xAxis } = build();
      const labelled = xAxis.data.filter((label, index) => xAxis.axisLabel.interval(index, label));

      expect(labelled).toHaveLength(12);
      expect(labelled.map((label) => xAxis.axisLabel.formatter(label))).toEqual([
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ]);
      expect(xAxis.axisTick.interval(0, '1 Jan')).toBe(true);
      expect(xAxis.axisTick.interval(10, '11 Jan')).toBe(false);
    });
  });

  describe('accessibility and layout', () => {
    it('should set its own aria description, which never prints null as NaN', () => {
      const { description } = build().aria.label;

      expect(description).toContain('one line per year from 2022 to 2024');
      expect(description).toContain('2024 (current year) and 2023 (record year)');
      expect(description).not.toContain('NaN');
    });

    it('should reserve room for a wrapping legend at every width', () => {
      const option = build();

      expect(option.grid.bottom).toBeGreaterThan(0);
      expect(option.media.length).toBeGreaterThan(0);
    });
  });

  it('should name no color: the grey comes from the theme adapter', () => {
    expect(findColorStrings(build(manyYears(1979, 2025)))).toEqual([]);
  });

  it('should not draw symbols on any series', () => {
    expect(build().series.every(({ showSymbol }) => showSymbol === false)).toBe(true);
  });
});
