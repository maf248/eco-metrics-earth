import type { MetricSeries } from '@eco-metrics/shared';

import { ProviderDataError } from '../../../src/common/errors/provider-error';
import {
  alignSeriesToYears,
  buildYearAlignedEntities,
  latestTimestamp,
  roundTo,
} from '../../../src/common/series/build-year-aligned-entities';

function makeSeries(code: string, name: string, points: [number, number | null][]): MetricSeries {
  return {
    entityCode: code,
    entityName: name,
    points: points.map(([year, value]) => ({ year, value })),
  };
}

const ALLOWED = new Set(['OWID_WRL', 'OWID_KOS', 'ARG', 'AFG', 'ATA']);
const identity = (value: number): number => value;

function build(
  measures: Record<string, { series: MetricSeries[]; convert?: (value: number) => number }>,
  allowedCodes: ReadonlySet<string> = ALLOWED,
) {
  const converted = Object.fromEntries(
    Object.entries(measures).map(([key, { series, convert }]) => [
      key,
      { series, convert: convert ?? identity },
    ]),
  );
  return buildYearAlignedEntities({
    label: 'Test data',
    startYear: 1950,
    allowedCodes,
    measures: converted,
  });
}

describe('buildYearAlignedEntities', () => {
  it('should merge two measures by entity code', () => {
    const { entities } = build({
      first: {
        series: [
          makeSeries('OWID_WRL', 'World', [[1950, 1]]),
          makeSeries('ARG', 'Argentina', [[1950, 2]]),
          makeSeries('ATA', 'Antarctica', [[1950, 3]]),
        ],
      },
      second: {
        series: [
          makeSeries('OWID_WRL', 'World', [[1950, 10]]),
          makeSeries('ARG', 'Argentina', [[1950, 20]]),
        ],
      },
    });

    const arg = entities.find((entity) => entity.code === 'ARG');
    const ata = entities.find((entity) => entity.code === 'ATA');
    expect(arg).toMatchObject({ first: [2], second: [20] });
    expect(ata).toMatchObject({ first: [3], second: [null] });
  });

  it('should give a single measure the same shape', () => {
    const { entities, endYear } = build({
      anomaly: {
        series: [
          makeSeries('OWID_WRL', 'World', [
            [1950, 0.1],
            [1951, 0.2],
          ]),
        ],
      },
    });

    expect(endYear).toBe(1951);
    expect(Object.keys(entities[0])).toEqual(['code', 'iso2', 'name', 'anomaly']);
    expect(entities[0].anomaly).toEqual([0.1, 0.2]);
  });

  it('should leave gaps as null and ignore years before the start year', () => {
    const { entities } = build({
      anomaly: {
        series: [
          makeSeries('OWID_WRL', 'World', [
            [1949, 9],
            [1950, 1],
            [1952, 3],
          ]),
        ],
      },
    });

    expect(entities[0].anomaly).toEqual([1, null, 3]);
  });

  it('should keep only allowed entities, World first and then by name', () => {
    const { entities } = build({
      anomaly: {
        series: [
          makeSeries('OWID_EUR', 'Europe', [[1950, 1]]),
          makeSeries('ZZZ', 'Nowhere', [[1950, 1]]),
          makeSeries('ARG', 'Argentina', [[1950, 1]]),
          makeSeries('OWID_WRL', 'World', [[1950, 1]]),
          makeSeries('AFG', 'Afghanistan', [[1950, 1]]),
        ],
      },
    });

    expect(entities.map(({ code }) => code)).toEqual(['OWID_WRL', 'AFG', 'ARG']);
  });

  it('should attach the alpha-2 code and null for World', () => {
    const { entities } = build({
      anomaly: {
        series: [
          makeSeries('OWID_WRL', 'World', [[1950, 1]]),
          makeSeries('OWID_KOS', 'Kosovo', [[1950, 1]]),
          makeSeries('ARG', 'Argentina', [[1950, 1]]),
        ],
      },
    });

    expect(entities.map(({ code, iso2 }) => [code, iso2])).toEqual([
      ['OWID_WRL', null],
      ['ARG', 'AR'],
      ['OWID_KOS', 'XK'],
    ]);
  });

  it('should drop entities whose values are null in every year', () => {
    const { entities } = build({
      anomaly: {
        series: [
          makeSeries('OWID_WRL', 'World', [[1950, 1]]),
          makeSeries('ARG', 'Argentina', [[1950, null]]),
        ],
      },
    });

    expect(entities.map(({ code }) => code)).toEqual(['OWID_WRL']);
  });

  it('should take the display name from the first measure that has the entity', () => {
    const { entities } = build({
      first: { series: [makeSeries('OWID_WRL', 'World', [[1950, 1]])] },
      second: {
        series: [
          makeSeries('OWID_WRL', 'World', [[1950, 1]]),
          makeSeries('ARG', 'Second name', [[1950, 1]]),
        ],
      },
    });

    expect(entities.find(({ code }) => code === 'ARG')?.name).toBe('Second name');
  });

  it('should apply the caller conversion to every present value', () => {
    const { entities } = build({
      total: {
        series: [makeSeries('OWID_WRL', 'World', [[1950, 29921192]])],
        convert: (value) => roundTo(value / 1_000_000, 3),
      },
    });

    expect(entities[0].total).toEqual([29.921]);
  });

  it('should be deterministic for the same input', () => {
    const measures = {
      anomaly: {
        series: [
          makeSeries('ARG', 'Argentina', [[1950, 1]]),
          makeSeries('OWID_WRL', 'World', [[1950, 1]]),
          makeSeries('AFG', 'Afghanistan', [[1950, 1]]),
        ],
      },
    };

    expect(build(measures)).toEqual(build(measures));
  });

  it('should break name ties by code', () => {
    const { entities } = build({
      anomaly: {
        series: [
          makeSeries('OWID_WRL', 'World', [[1950, 1]]),
          makeSeries('OWID_KOS', 'Same', [[1950, 1]]),
          makeSeries('ARG', 'Same', [[1950, 1]]),
        ],
      },
    });

    expect(entities.map(({ code }) => code)).toEqual(['OWID_WRL', 'ARG', 'OWID_KOS']);
  });

  it('should throw a ProviderDataError labelled with the dataset when no year has a value', () => {
    expect(() =>
      build({
        anomaly: { series: [makeSeries('OWID_WRL', 'World', [[1950, null]])] },
      }),
    ).toThrow(new ProviderDataError('Test data response has no value in any year'));
  });

  it('should throw a ProviderDataError when World is missing', () => {
    const attempt = (): unknown =>
      build({ anomaly: { series: [makeSeries('ARG', 'Argentina', [[1950, 1]])] } });

    expect(attempt).toThrow(ProviderDataError);
    expect(attempt).toThrow('Test data response has no World entity');
  });
});

describe('roundTo', () => {
  it('should round to the requested decimals', () => {
    expect(roundTo(0.5916424, 2)).toBe(0.59);
    expect(roundTo(-0.84749717, 2)).toBe(-0.85);
  });

  it('should return 0 rather than -0', () => {
    const result = roundTo(-0.001, 2);

    expect(result).toBe(0);
    expect(Object.is(result, -0)).toBe(false);
  });
});

describe('latestTimestamp', () => {
  it('should return the latest of several timestamps as given', () => {
    expect(
      latestTimestamp(
        '2026-10-13T08:42:32.000Z',
        '2026-10-22T21:47:04.000Z',
        '2025-01-01T00:00:00.000Z',
      ),
    ).toBe('2026-10-22T21:47:04.000Z');
  });

  it('should return the only timestamp when given one', () => {
    expect(latestTimestamp('2026-10-13T08:42:32.000Z')).toBe('2026-10-13T08:42:32.000Z');
  });
});

describe('alignSeriesToYears', () => {
  it('should place values by year and leave gaps as null', () => {
    const series = makeSeries('OWID_WRL', 'World', [
      [1850, 1.5],
      [1852, 2.5],
    ]);

    expect(alignSeriesToYears(series, 1850, 3, (value) => value * 2)).toEqual([3, null, 5]);
  });

  it('should ignore years outside the range', () => {
    const series = makeSeries('OWID_WRL', 'World', [
      [1849, 9],
      [1850, 1],
      [1853, 9],
    ]);

    expect(alignSeriesToYears(series, 1850, 3, (value) => value)).toEqual([1, null, null]);
  });

  it('should return only nulls for a missing series', () => {
    expect(alignSeriesToYears(undefined, 1850, 2, (value) => value)).toEqual([null, null]);
  });
});
