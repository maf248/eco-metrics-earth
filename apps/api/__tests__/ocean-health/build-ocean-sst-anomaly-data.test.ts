import type { MetricSeries } from '@eco-metrics/shared';

import { ProviderDataError } from '../../src/common/errors/provider-error';
import { buildOceanSstAnomalyData } from '../../src/modules/ocean-health/ocean-sst-anomaly.service';
import type { OwidIndicatorMetadata } from '../../src/modules/providers/owid/owid.types';
import { parseGrapherCsv } from '../../src/modules/providers/owid/parseGrapherCsv';

import { fixture, jsonFixture } from './helpers';

const CSV = fixture('sea-surface-temperature-anomaly.csv');
const metadata = jsonFixture<{ id: number } & Record<string, unknown>>(
  'indicator-1357160-metadata.json',
);

function inputWith(overrides: Partial<OwidIndicatorMetadata> = {}, maxYear = 2025) {
  return {
    mean: parseGrapherCsv(CSV, 'sea_temperature_anomaly_annual'),
    lower: parseGrapherCsv(CSV, 'sea_temperature_anomaly_low_annual'),
    upper: parseGrapherCsv(CSV, 'sea_temperature_anomaly_high_annual'),
    metadata: {
      id: metadata.id,
      name: 'Annual sea surface temperature anomalies',
      unit: 'degrees Celsius',
      shortUnit: '°C',
      datasetName: 'Climate Change Impacts - Annual',
      datasetVersion: '2026-11-11',
      timespan: '1850-2026',
      updatedAt: '2026-11-11T21:16:33.000Z',
      descriptionShort:
        'Deviation of the average sea surface temperature from the 1861-1890 mean, in degrees Celsius.',
      entities: [],
      ...overrides,
    } satisfies OwidIndicatorMetadata,
    maxYear,
  };
}

function seriesOf(
  code: string,
  name: string,
  values: (number | null)[],
  from = 2000,
): MetricSeries {
  return {
    entityName: name,
    entityCode: code,
    points: values.map((value, index) => ({ year: from + index, value })),
  };
}

describe('buildOceanSstAnomalyData', () => {
  it('should list World, Northern Hemisphere and Southern Hemisphere with equal-length arrays', () => {
    const { data } = buildOceanSstAnomalyData(inputWith());

    expect(data.regions.map(({ code, name }) => [code, name])).toEqual([
      ['OWID_WRL', 'World'],
      ['OWID_NH', 'Northern Hemisphere'],
      ['OWID_SH', 'Southern Hemisphere'],
    ]);
    const lengths = data.regions.flatMap(({ mean, lower, upper }) => [
      mean.length,
      lower.length,
      upper.length,
    ]);
    expect(new Set(lengths)).toEqual(new Set([4]));
  });

  it('should round to two decimals and never emit -0', () => {
    const { data } = buildOceanSstAnomalyData(inputWith());

    const world = data.regions[0];
    expect(world.mean.every((value) => value === null || Number(value.toFixed(2)) === value)).toBe(
      true,
    );

    const tiny = buildOceanSstAnomalyData({
      ...inputWith(),
      mean: [
        seriesOf('OWID_WRL', 'World', [-0.001, 0.5]),
        seriesOf('OWID_NH', 'Northern Hemisphere', [0.1, 0.2]),
        seriesOf('OWID_SH', 'Southern Hemisphere', [0.1, 0.2]),
      ],
    });
    expect(Object.is(tiny.data.regions[0].mean[0], 0)).toBe(true);
  });

  it('should take dataset and lastUpdated from the indicator metadata', () => {
    const result = buildOceanSstAnomalyData(inputWith());

    expect(result.data.dataset).toEqual({
      name: 'Climate Change Impacts - Annual',
      version: '2026-11-11',
    });
    expect(result.lastUpdated).toBe('2026-11-11T21:16:33.000Z');
    expect(result.data).toMatchObject({
      unit: '°C',
      baseline: { startYear: 1861, endYear: 1890 },
      origin: {
        producer: 'Met Office Hadley Centre',
        license: { name: 'Open Government Licence v3.0' },
      },
    });
  });

  it('should not serve the partial current year', () => {
    const { data } = buildOceanSstAnomalyData(inputWith({}, 2025));

    expect(data.startYear).toBe(2022);
    expect(data.endYear).toBe(2025);
    expect(data.regions[0].mean).toHaveLength(4);
  });

  it('should serve the year after a rollover when the cap moves', () => {
    expect(buildOceanSstAnomalyData(inputWith({}, 2026)).data.endYear).toBe(2026);
  });

  it('should accept an en dash in the baseline description', () => {
    const result = buildOceanSstAnomalyData(
      inputWith({ descriptionShort: 'Relative to the 1861–1890 mean.' }),
    );

    expect(result.data.baseline.startYear).toBe(1861);
  });

  it.each([
    ['a different baseline', 'Relative to the 1961-1990 mean.'],
    ['no description', null],
  ])('should throw ProviderDataError for %s', (_, descriptionShort) => {
    expect(() => buildOceanSstAnomalyData(inputWith({ descriptionShort }))).toThrow(
      ProviderDataError,
    );
  });

  it('should throw ProviderDataError for a World series with fewer than two years', () => {
    const mapShaped = {
      ...inputWith(),
      mean: [
        seriesOf('OWID_WRL', 'World', [1], 2025),
        seriesOf('OWID_NH', 'Northern Hemisphere', [1], 2025),
        seriesOf('OWID_SH', 'Southern Hemisphere', [1], 2025),
      ],
      lower: [],
      upper: [],
    };

    expect(() => buildOceanSstAnomalyData(mapShaped)).toThrow(/fewer than 2 years/);
  });

  it('should throw ProviderDataError when a hemisphere is missing', () => {
    const input = inputWith();

    expect(() =>
      buildOceanSstAnomalyData({
        ...input,
        mean: input.mean.filter(({ entityCode }) => entityCode !== 'OWID_SH'),
      }),
    ).toThrow(/Southern Hemisphere/);
  });

  it('should throw ProviderDataError when nothing has a value', () => {
    const input = inputWith();

    expect(() =>
      buildOceanSstAnomalyData({
        ...input,
        mean: input.mean.map((series) => ({
          ...series,
          points: series.points.map(({ year }) => ({ year, value: null })),
        })),
        lower: [],
        upper: [],
      }),
    ).toThrow(/no value in any year/);
  });

  it('should keep a region bound null when the provider has none', () => {
    const input = inputWith();

    const { data } = buildOceanSstAnomalyData({ ...input, lower: [], upper: [] });

    expect(data.regions[0].lower.every((value) => value === null)).toBe(true);
    expect(data.regions[0].mean.every((value) => value !== null)).toBe(true);
  });
});
