import type { MetricPoint, MetricSeries } from '../../src/lib/metric-series';

describe('MetricSeries types', () => {
  it('should represent a series with entity identity and points', () => {
    const series: MetricSeries = {
      entityName: 'Argentina',
      entityCode: 'ARG',
      points: [
        { year: 1990, value: 3.5 },
        { year: 1991, value: 3.6 },
      ],
    };

    expect(series.entityName).toBe('Argentina');
    expect(series.entityCode).toBe('ARG');
    expect(series.points).toHaveLength(2);
  });

  it('should allow null values for missing observations', () => {
    const point: MetricPoint = { year: 1992, value: null };
    expect(point.year).toBe(1992);
    expect(point.value).toBeNull();
  });

  it('should allow OWID region codes as entity codes', () => {
    const series: MetricSeries = {
      entityName: 'World',
      entityCode: 'OWID_WRL',
      points: [{ year: 2020, value: 1.2 }],
    };
    expect(series.entityCode).toBe('OWID_WRL');
  });
});
