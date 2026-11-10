import { rankCo2Countries } from '@/lib/co2Ranking';
import type { Co2EmissionsEntity } from '@eco-metrics/shared';

import { CO2_FIXTURE } from '../fixtures/co2Emissions';

const names = (rows: ReturnType<typeof rankCo2Countries>): string[] =>
  rows.map(({ entity }) => entity.name);

function entity(code: string, name: string, perCapita: number | null): Co2EmissionsEntity {
  return { code, iso2: null, name, total: [1], perCapita: [perCapita] };
}

describe('rankCo2Countries', () => {
  it('should rank countries by per-capita value, highest first, leaving World out', () => {
    const rows = rankCo2Countries(CO2_FIXTURE, 2024);
    expect(names(rows)).toEqual(['United States', 'Argentina', "Côte d'Ivoire", 'Kosovo']);
    expect(rows.map(({ rank }) => rank)).toEqual([1, 2, 3, 4]);
    expect(rows[0]).toMatchObject({ perCapita: 13.8, total: 4650 });
  });

  it('should list the lowest first in ascending order while keeping each rank', () => {
    const rows = rankCo2Countries(CO2_FIXTURE, 2024, { key: 'perCapita', order: 'ascending' });
    expect(names(rows)).toEqual(['Kosovo', "Côte d'Ivoire", 'Argentina', 'United States']);
    expect(rows.map(({ rank }) => rank)).toEqual([4, 3, 2, 1]);
  });

  it('should leave out a country without a per-capita value in that year', () => {
    expect(names(rankCo2Countries(CO2_FIXTURE, 2022))).not.toContain('Argentina');
  });

  it('should return no rows for a year outside the series', () => {
    expect(rankCo2Countries(CO2_FIXTURE, 1990)).toEqual([]);
  });

  it('should keep a null total as null', () => {
    const data = {
      startYear: 2024,
      entities: [{ ...entity('ARG', 'Argentina', 3), total: [null] }],
    };
    expect(rankCo2Countries(data, 2024)[0].total).toBeNull();
  });

  it('should give equal values the same competition rank and list them by name', () => {
    const data = {
      startYear: 2024,
      entities: [
        entity('CCC', 'Chad', 1),
        entity('BBB', 'Benin', 5),
        entity('AAA', 'Angola', 5),
        entity('DDD', 'Denmark', 0.5),
      ],
    };
    const rows = rankCo2Countries(data, 2024);
    expect(names(rows)).toEqual(['Angola', 'Benin', 'Chad', 'Denmark']);
    expect(rows.map(({ rank }) => rank)).toEqual([1, 1, 3, 4]);
    expect(names(rankCo2Countries(data, 2024, { key: 'perCapita', order: 'ascending' }))).toEqual([
      'Denmark',
      'Chad',
      'Angola',
      'Benin',
    ]);
  });

  it('should rank by total when asked, keeping the per-capita countries', () => {
    const rows = rankCo2Countries(CO2_FIXTURE, 2024, { key: 'total', order: 'descending' });
    expect(names(rows)).toEqual(['United States', 'Argentina', "Côte d'Ivoire", 'Kosovo']);
    expect(rows.map(({ rank }) => rank)).toEqual([1, 2, 3, 4]);
    expect(
      names(rankCo2Countries(CO2_FIXTURE, 2024, { key: 'total', order: 'ascending' })),
    ).toEqual(['Kosovo', "Côte d'Ivoire", 'Argentina', 'United States']);
  });

  it('should list a country without a total last and unranked, in both orders', () => {
    const data = {
      startYear: 2024,
      entities: [
        { ...entity('AAA', 'Angola', 1), total: [null] },
        { ...entity('BBB', 'Benin', 2), total: [5] },
        { ...entity('CCC', 'Chad', 3), total: [9] },
      ],
    };
    for (const order of ['descending', 'ascending'] as const) {
      const rows = rankCo2Countries(data, 2024, { key: 'total', order });
      expect(rows[rows.length - 1]).toMatchObject({ rank: null, total: null });
      expect(rows[rows.length - 1].entity.name).toBe('Angola');
    }
  });
});
