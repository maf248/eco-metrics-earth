import { gzipSync } from 'zlib';

import { ProviderDataError } from '../../src/common/errors/provider-error';
import { buildOceanSstDailyData } from '../../src/modules/ocean-health/ocean-sst-daily.service';
import { COPERNICUS_CLIMATE_PULSE_ORIGIN } from '../../src/modules/providers/copernicus-climate-pulse/copernicus-climate-pulse.constants';
import {
  type CopernicusSstRow,
  type CopernicusSstSeries,
  parseCopernicusSstCsv,
} from '../../src/modules/providers/copernicus-climate-pulse/copernicus-climate-pulse.parser';

import { fixture } from './helpers';

const SLOT_29_FEB = 59;
const SLOT_1_MAR = 60;

function row(date: string, sst: number, status = 'FINAL'): CopernicusSstRow {
  return { date, sst, climatology: 20, anomaly: Math.round((sst - 20) * 1000) / 1000, status };
}

function series(rows: CopernicusSstRow[]): CopernicusSstSeries {
  return { rows, lastUpdated: '2026-11-24T00:00:00.000Z' };
}

function daysBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (
    let time = Date.parse(`${from}T00:00:00Z`);
    time <= Date.parse(`${to}T00:00:00Z`);
    time += 86_400_000
  ) {
    dates.push(new Date(time).toISOString().slice(0, 10));
  }
  return dates;
}

describe('buildOceanSstDailyData', () => {
  const fixtureSeries = parseCopernicusSstCsv(fixture('era5_daily_series_sst_60S-60N_ocean.csv'));

  describe('calendar-day alignment', () => {
    const { data } = buildOceanSstDailyData(fixtureSeries);

    it('should give one ascending entry per calendar year with 366 slots', () => {
      expect(data.years.map(({ year }) => year)).toEqual([2023, 2024, 2025]);
      expect(data.years.every(({ values }) => values.length === 366)).toBe(true);
    });

    it('should align 1 March to the same slot in a common year and a leap year', () => {
      const dateOf = (year: number): string => `${year}-03-01`;
      for (const year of [2023, 2024]) {
        const expected = fixtureSeries.rows.find(({ date }) => date === dateOf(year))?.sst;
        expect(data.years.find((entry) => entry.year === year)?.values[SLOT_1_MAR]).toBe(expected);
      }
    });

    it('should leave the 29 February slot null in the common year and filled in the leap year', () => {
      expect(data.years[0].values[SLOT_29_FEB]).toBeNull();
      expect(data.years[1].values[SLOT_29_FEB]).toBe(
        fixtureSeries.rows.find(({ date }) => date === '2024-02-29')?.sst,
      );
    });

    it('should fill the climatology from the data, including 29 February', () => {
      expect(data.climatology).toHaveLength(366);
      expect(data.climatology.every((value) => value !== null)).toBe(true);
      expect(data.climatology[SLOT_29_FEB]).toBe(
        fixtureSeries.rows.find(({ date }) => date === '2024-02-29')?.climatology,
      );
    });
  });

  describe('latest value', () => {
    const { data } = buildOceanSstDailyData(fixtureSeries);

    it('should take latest and endYear from the latest row, never from the clock', () => {
      expect(data.latest.date).toBe('2025-04-20');
      expect(data.endYear).toBe(2025);
      expect(data.startYear).toBe(2023);
    });

    it('should leave every slot after the latest day of that year null', () => {
      const lastSlot = 110; // 20 April in a leap year: 91 + 20 - 1
      const values = data.years[2].values;
      expect(values[lastSlot]).not.toBeNull();
      expect(values.slice(lastSlot + 1).every((value) => value === null)).toBe(true);
    });

    it('should preserve the preliminary status of the latest row', () => {
      expect(data.latest.status).toBe('preliminary');
      expect(data.recent.at(-2)?.status).toBe('final');
    });

    it('should serve the constants of the series', () => {
      expect(data).toMatchObject({
        unit: '°C',
        coverage: '60°S–60°N',
        baseline: { startYear: 1991, endYear: 2020 },
        origin: COPERNICUS_CLIMATE_PULSE_ORIGIN,
      });
    });

    it('should keep the provider timestamp', () => {
      expect(buildOceanSstDailyData(fixtureSeries).lastUpdated).toBe('2026-11-24T00:00:00.000Z');
    });
  });

  describe('record', () => {
    it('should be the day with the highest absolute sst, not the highest anomaly', () => {
      const result = buildOceanSstDailyData(
        series([
          { ...row('2024-01-01', 21), anomaly: 0.1 },
          { ...row('2024-01-02', 20.5), anomaly: 0.9 },
        ]),
      );

      expect(result.data.record.date).toBe('2024-01-01');
    });

    it('should name the most recent date on a tie', () => {
      const result = buildOceanSstDailyData(
        series([row('2023-02-01', 21), row('2024-02-01', 20), row('2025-02-01', 21)]),
      );

      expect(result.data.record.date).toBe('2025-02-01');
    });

    it('should be the real maximum of the fixture and not in the latest year', () => {
      const { data } = buildOceanSstDailyData(fixtureSeries);

      const max = Math.max(...fixtureSeries.rows.map(({ sst }) => sst));
      expect(data.record.sst).toBe(max);
      expect(data.record.date.startsWith('2025')).toBe(false);
    });
  });

  describe('recent rows', () => {
    it('should bound recent to exactly 90 ascending entries ending on latest', () => {
      const { data } = buildOceanSstDailyData(fixtureSeries);

      expect(data.recent).toHaveLength(90);
      const dates = data.recent.map(({ date }) => date);
      expect(dates).toEqual([...dates].sort());
      expect(data.recent.at(-1)).toEqual(data.latest);
    });

    it('should serve every row when there are fewer than 90', () => {
      const result = buildOceanSstDailyData(series([row('2024-01-01', 20), row('2024-01-02', 21)]));

      expect(result.data.recent).toHaveLength(2);
    });
  });

  describe('status and empty data', () => {
    it('should map FINAL and PRELIMINARY case-insensitively', () => {
      const result = buildOceanSstDailyData(
        series([row('2024-01-01', 20, 'final'), row('2024-01-02', 20, 'Preliminary')]),
      );

      expect(result.data.recent.map(({ status }) => status)).toEqual(['final', 'preliminary']);
    });

    it.each(['DRAFT', 'constructor'])(
      'should throw ProviderDataError for the status "%s"',
      (status) => {
        expect(() => buildOceanSstDailyData(series([row('2024-01-01', 20, status)]))).toThrow(
          ProviderDataError,
        );
      },
    );

    it('should throw ProviderDataError when there are no rows', () => {
      expect(() => buildOceanSstDailyData(series([]))).toThrow(ProviderDataError);
    });

    it('should leave a year without data entirely null', () => {
      const result = buildOceanSstDailyData(series([row('2022-06-01', 20), row('2024-06-01', 21)]));

      expect(result.data.years.map(({ year }) => year)).toEqual([2022, 2023, 2024]);
      expect(result.data.years[1].values.every((value) => value === null)).toBe(true);
    });
  });

  describe('payload size', () => {
    it('should stay under about 80 KB gzipped for a full-size synthetic dataset', () => {
      let seed = 12345;
      const noise = (): number => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return (seed / 4294967296 - 0.5) * 0.02;
      };
      const rows = daysBetween('1979-01-01', '2026-11-22').map((date, index) => {
        const dayOfYear = index % 365.25;
        const sst = 20.4 + 0.2 * Math.sin((dayOfYear / 365.25) * 2 * Math.PI) + index * 0.00003;
        return row(date, Math.round((sst + noise()) * 1000) / 1000);
      });

      const { data } = buildOceanSstDailyData(series(rows));

      const gzipped = gzipSync(JSON.stringify(data)).length;
      expect(data.years).toHaveLength(48);
      expect(gzipped).toBeLessThan(80 * 1024);
    });
  });
});
