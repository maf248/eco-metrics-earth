import {
  deriveAcidityFigure,
  deriveSeaLevelRise,
  deriveSstFigure,
  deriveWarmingFigure,
  formatDayMonthYear,
  formatMonthYear,
  formatShortMonthYear,
  formatTemperature,
} from '@/lib/oceanHealthKeyFigures';
import type { OceanSstAnomalyRegion, OceanSstDailyPoint } from '@eco-metrics/shared';

import {
  OCEAN_PH_FIXTURE,
  OCEAN_SEA_LEVEL_FIXTURE,
  OCEAN_SST_ANOMALY_FIXTURE,
} from '../fixtures/oceanHealth';

const point = (date: string, sst: number, anomaly = 0.5): OceanSstDailyPoint => ({
  date,
  sst,
  climatology: sst - anomaly,
  anomaly,
  status: 'final',
});

describe('formatTemperature', () => {
  it('should round to two decimals', () => {
    expect(formatTemperature(20.875)).toBe('20.88');
    expect(formatTemperature(21.109)).toBe('21.11');
    expect(formatTemperature(20)).toBe('20.00');
  });
});

describe('formatDayMonthYear', () => {
  it('should write the day, the short month and the year in UTC', () => {
    expect(formatDayMonthYear('2026-11-22')).toBe('22 Nov 2026');
    expect(formatDayMonthYear('2026-09-01')).toBe('1 Sep 2026');
    expect(formatDayMonthYear('2024-02-29')).toBe('29 Feb 2024');
  });
});

describe('formatMonthYear', () => {
  it('should write the month and the year in UTC', () => {
    expect(formatMonthYear('2025-02-15')).toBe('February 2025');
    expect(formatMonthYear('2025-03-01')).toBe('March 2025');
  });
});

describe('formatShortMonthYear', () => {
  it('should write the short month and the year in UTC', () => {
    expect(formatShortMonthYear('1992-12-17')).toBe('Dec 1992');
  });
});

describe('deriveSstFigure', () => {
  it('should format the latest value, its signed anomaly and the record', () => {
    const figure = deriveSstFigure({
      latest: point('2026-11-22', 20.875, 0.758),
      record: point('2026-08-24', 21.109),
    });

    expect(figure.latest).toEqual({
      date: '2026-11-22',
      dateText: '22 Nov 2026',
      sst: '20.88',
      anomaly: '+0.76',
      preliminary: false,
    });
    expect(figure.record).toEqual({ date: '2026-08-24', dateText: '24 Aug 2026', sst: '21.11' });
  });

  it('should use the real minus sign and flag a preliminary value', () => {
    const latest = { ...point('2026-11-22', 20.1, -0.154), status: 'preliminary' as const };
    const figure = deriveSstFigure({ latest, record: point('2026-08-24', 21.1) });

    expect(figure.latest.anomaly).toBe('−0.15');
    expect(figure.latest.preliminary).toBe(true);
  });

  it('should have no separate record when the latest day is the record', () => {
    const latest = point('2026-11-22', 21.2);

    expect(deriveSstFigure({ latest, record: latest }).record).toBeUndefined();
  });
});

describe('deriveWarmingFigure', () => {
  const world = (mean: (number | null)[]): OceanSstAnomalyRegion => ({
    code: 'OWID_WRL',
    name: 'World',
    mean,
    lower: mean,
    upper: mean,
  });

  it('should give the last World year and name a different warmest year', () => {
    const figure = deriveWarmingFigure({ startYear: 2022, regions: [world([0.9, 1.207, 1.096])] });

    expect(figure).toEqual({
      year: 2024,
      anomaly: '+1.10',
      firstYear: 2022,
      warmest: { year: 2023, anomaly: '+1.21' },
    });
  });

  it('should have no separate warmest year when the last year is the warmest', () => {
    const figure = deriveWarmingFigure(OCEAN_SST_ANOMALY_FIXTURE);

    expect(figure).toEqual({ year: 2024, anomaly: '+1.20', firstYear: 2020, warmest: undefined });
  });

  it('should skip missing years and return undefined without any World value', () => {
    expect(deriveWarmingFigure({ startYear: 2020, regions: [world([1, null])] })?.year).toBe(2020);
    expect(deriveWarmingFigure({ startYear: 2020, regions: [world([null])] })).toBeUndefined();
  });
});

describe('deriveSeaLevelRise', () => {
  it('should measure from the earliest to the latest observation of any mission', () => {
    const rise = deriveSeaLevelRise(OCEAN_SEA_LEVEL_FIXTURE);

    expect(rise.first).toEqual({
      date: '1992-12-17',
      dateText: '17 Dec 1992',
      monthText: 'Dec 1992',
    });
    expect(rise.latest).toEqual({
      date: '2025-02-15',
      dateText: '15 Feb 2025',
      monthText: 'Feb 2025',
    });
    // 104.8 − (−19.33) = 124.13 mm.
    expect(rise.changeMm).toBe(124);
    expect(rise.changeCmText).toBe('+12');
    expect(rise.years).toBe(32);
  });

  it('should use the mission listed last on a shared latest date', () => {
    const rise = deriveSeaLevelRise({
      missions: [
        { id: 'a', name: 'A', dates: ['2000-01-01', '2001-01-01'], values: [0, 10] },
        { id: 'b', name: 'B', dates: ['2000-06-01', '2001-01-01'], values: [5, 12] },
      ],
    });

    expect(rise.changeMm).toBe(12);
    expect(rise.years).toBe(1);
  });

  it('should sign a fall with the real minus sign', () => {
    const rise = deriveSeaLevelRise({
      missions: [{ id: 'a', name: 'A', dates: ['2000-01-01', '2010-01-01'], values: [30, 0] }],
    });

    expect(rise.changeMm).toBe(-30);
    expect(rise.changeCmText).toBe('−3');
  });
});

describe('deriveAcidityFigure', () => {
  it('should turn the fall in yearly pH into a rise in hydrogen ions', () => {
    // 10^(8.11 − 8.0392) − 1 = 17.7%.
    expect(deriveAcidityFigure(OCEAN_PH_FIXTURE)).toEqual({
      percentText: '+18',
      moreAcidic: true,
      first: { year: 1990, ph: '8.11' },
      latest: { year: 2024, ph: '8.04' },
    });
  });

  it('should report a pH that rose as less acidic, with a negative percentage', () => {
    const figure = deriveAcidityFigure({
      dates: ['2000-01-01', '2010-01-01'],
      yearlyAverage: [8.0, 8.1],
    });

    expect(figure?.moreAcidic).toBe(false);
    expect(figure?.percentText).toBe('−21');
  });

  it('should return undefined without any yearly average', () => {
    expect(deriveAcidityFigure({ dates: ['2000-01-01'], yearlyAverage: [null] })).toBeUndefined();
  });
});
