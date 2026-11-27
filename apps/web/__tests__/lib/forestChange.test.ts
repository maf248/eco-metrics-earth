import {
  DEFAULT_FOREST_RANKING_SORT,
  forestChange,
  rankForestCountries,
  RANKING_MIN_FIRST_AREA_HA,
  roundPercent,
} from '@/lib/forestChange';
import type { ForestAreaData, ForestAreaEntity } from '@eco-metrics/shared';

import { FOREST_FIXTURE, forestEntityByCode } from '../fixtures/deforestation';

const RANGE = { startYear: 1990, endYear: 1992 };

const entity = (code: string, name: string, area: (number | null)[]): ForestAreaEntity => ({
  code,
  iso2: null,
  name,
  area,
  share: area.map(() => null),
});

describe('forestChange', () => {
  it('should derive hectares and percent from the first and last year', () => {
    const change = forestChange(forestEntityByCode('BRA'), FOREST_FIXTURE);

    expect(change?.hectares).toBe(486086620 - 618443260);
    expect(change?.percent).toBeCloseTo(-21.4, 1);
  });

  it('should give a hectares change and no percentage when the first value is 0', () => {
    expect(forestChange(entity('NRU', 'Nauru', [0, 0, 0]), RANGE)).toEqual({
      hectares: 0,
      percent: null,
    });
  });

  it('should have no change when the first or the last year has no value', () => {
    expect(forestChange(entity('A', 'A', [null, 1, 2]), RANGE)).toBeUndefined();
    expect(forestChange(entity('B', 'B', [1, 2, null]), RANGE)).toBeUndefined();
  });

  it('should never produce NaN or Infinity', () => {
    const change = forestChange(entity('Z', 'Z', [0, 5, 7]), RANGE);

    expect(Number.isFinite(change?.hectares)).toBe(true);
    expect(change?.percent).toBeNull();
  });
});

describe('roundPercent', () => {
  it('should round to one decimal, the value the tables print', () => {
    expect(roundPercent(-5.04)).toBe(-5);
    expect(roundPercent(-4.96)).toBe(-5);
    expect(roundPercent(-5.06)).toBe(-5.1);
  });
});

describe('rankForestCountries', () => {
  const names = (rows: { entity: ForestAreaEntity }[]): string[] =>
    rows.map(({ entity: { name } }) => name);

  it('should exclude World and rank by net hectares, largest loss first, by default', () => {
    const { rows } = rankForestCountries(FOREST_FIXTURE, DEFAULT_FOREST_RANKING_SORT);

    expect(names(rows)).toEqual(['Brazil', 'Burkina Faso', 'Nauru', 'Ireland', 'Russia', 'China']);
    expect(rows[0].rank).toBe(1);
    expect(rows.some(({ entity: { code } }) => code === 'OWID_WRL')).toBe(false);
  });

  it('should rank by percentage only countries at or above the threshold, the rest after', () => {
    const { rows, unrankedByPercent } = rankForestCountries(FOREST_FIXTURE, {
      key: 'percent',
      order: 'ascending',
    });

    expect(names(rows)).toEqual(['Burkina Faso', 'Brazil', 'Russia', 'China', 'Ireland', 'Nauru']);
    expect(rows.map(({ rank }) => rank)).toEqual([1, 2, 3, 4, null, null]);
    expect(unrankedByPercent).toBe(2);
    expect(forestEntityByCode('IRL').area[0]).toBeLessThan(RANKING_MIN_FIRST_AREA_HA);
  });

  it('should keep ranks and the trailing rows when the percentage order is reversed', () => {
    const { rows } = rankForestCountries(FOREST_FIXTURE, { key: 'percent', order: 'descending' });

    expect(names(rows)).toEqual(['China', 'Russia', 'Brazil', 'Burkina Faso', 'Ireland', 'Nauru']);
    expect(rows.map(({ rank }) => rank)).toEqual([4, 3, 2, 1, null, null]);
  });

  it('should show the percentage of an unranked country but leave its rank empty', () => {
    const { rows } = rankForestCountries(FOREST_FIXTURE, { key: 'percent', order: 'ascending' });
    const ireland = rows.find(({ entity: { code } }) => code === 'IRL');
    const nauru = rows.find(({ entity: { code } }) => code === 'NRU');

    expect(ireland?.percent).toBeGreaterThan(0);
    expect(nauru?.percent).toBeNull();
  });

  it('should give equal values the same competition rank', () => {
    const data: Pick<ForestAreaData, 'startYear' | 'endYear' | 'entities'> = {
      ...RANGE,
      entities: [
        entity('A', 'Alpha', [10, 5, 5]),
        entity('B', 'Beta', [10, 5, 5]),
        entity('C', 'Gamma', [10, 5, 8]),
      ],
    };
    const { rows } = rankForestCountries(data);

    expect(rows.map(({ rank }) => rank)).toEqual([1, 1, 3]);
  });

  it('should list a country without a net change last, unranked, in every sort', () => {
    const data: Pick<ForestAreaData, 'startYear' | 'endYear' | 'entities'> = {
      ...RANGE,
      entities: [entity('A', 'Alpha', [10, 5, null]), entity('B', 'Beta', [10, 5, 5])],
    };

    expect(names(rankForestCountries(data).rows)).toEqual(['Beta', 'Alpha']);
    expect(rankForestCountries(data).rows[1].rank).toBeNull();
    expect(rankForestCountries(data).rows[1].hectares).toBeNull();
  });
});
