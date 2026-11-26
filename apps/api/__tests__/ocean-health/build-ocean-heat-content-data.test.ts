import type { MetricSeries } from '@eco-metrics/shared';

import { ProviderDataError } from '../../src/common/errors/provider-error';
import { heatContentColumn } from '../../src/modules/ocean-health/ocean-health.constants';
import {
  type HeatDepthInput,
  buildOceanHeatContentData,
} from '../../src/modules/ocean-health/ocean-heat-content.service';
import type { OwidIndicatorMetadata } from '../../src/modules/providers/owid/owid.types';
import { parseGrapherCsv } from '../../src/modules/providers/owid/parseGrapherCsv';

import { fixture } from './helpers';

const SOURCES = {
  '700m': ['iap', 'noaa', 'mri', 'csiro'],
  '2000m': ['noaa', 'mri', 'iap'],
} as const;
const CSVS = {
  '700m': fixture('ocean-heat-content-upper.csv'),
  '2000m': fixture('ocean-heat-top-2000m.csv'),
} as const;

function metadata(overrides: Partial<OwidIndicatorMetadata> = {}): OwidIndicatorMetadata {
  return {
    id: 1,
    name: 'Ocean heat content',
    unit: '10²² Joules',
    shortUnit: '10²² J',
    datasetName: 'Climate Change Impacts - Annual',
    datasetVersion: '2026-11-11',
    timespan: '1955-2025',
    updatedAt: '2026-11-11T21:16:32.000Z',
    descriptionShort: 'Measured in 10²² Joules.',
    entities: [],
    ...overrides,
  };
}

function depth(
  id: '700m' | '2000m',
  overrides: Partial<OwidIndicatorMetadata> = {},
  transform: (sourceId: string, series: MetricSeries[]) => MetricSeries[] = (_, series) => series,
): HeatDepthInput {
  return {
    id,
    sources: SOURCES[id].map((sourceId) => ({
      id: sourceId,
      series: transform(sourceId, parseGrapherCsv(CSVS[id], heatContentColumn(sourceId, id))),
    })),
    metadata: metadata(overrides),
  };
}

function input(maxYear = 2025) {
  return { depths: [depth('700m'), depth('2000m')], maxYear };
}

describe('buildOceanHeatContentData', () => {
  it('should list the sources of each depth in their order', () => {
    const { data } = buildOceanHeatContentData(input());

    expect(data.depths.map(({ id, label }) => [id, label])).toEqual([
      ['700m', '0–700 m'],
      ['2000m', '0–2000 m'],
    ]);
    expect(data.depths[0].sources.map(({ id, name }) => [id, name])).toEqual([
      ['iap', 'IAP'],
      ['noaa', 'NOAA'],
      ['mri', 'MRI/JMA'],
      ['csiro', 'CSIRO'],
    ]);
    expect(data.depths[1].sources.map(({ id }) => id)).toEqual(['noaa', 'mri', 'iap']);
  });

  it('should align every source on one shared year range with null (never zero) after a source ends', () => {
    const { data } = buildOceanHeatContentData(input());

    expect(data.startYear).toBe(2012);
    expect(data.endYear).toBe(2025);
    const lengths = data.depths.flatMap(({ sources }) =>
      sources.map(({ values }) => values.length),
    );
    expect(new Set(lengths)).toEqual(new Set([14]));
    const csiro = data.depths[0].sources[3].values;
    expect(csiro[3]).toBe(15.88); // 2015
    expect(csiro.slice(4).every((value) => value === null)).toBe(true);
    const noaa = data.depths[0].sources[1].values;
    expect(noaa.at(-1)).toBe(22.85);
    expect(data.depths[0].sources[0].values[8]).toBe(20.01); // IAP 2020, its last year
    expect(data.depths[0].sources[0].values[9]).toBeNull(); // IAP 2021 is blank
  });

  it('should round to two decimals', () => {
    const { data } = buildOceanHeatContentData(input());

    const values = data.depths.flatMap(({ sources }) => sources.flatMap(({ values }) => values));
    expect(values.every((value) => value === null || Number(value.toFixed(2)) === value)).toBe(
      true,
    );
  });

  it('should not serve the partial current year', () => {
    const { data } = buildOceanHeatContentData(input(2023));

    expect(data.endYear).toBe(2023);
    expect(data.depths[0].sources[0].values).toHaveLength(12);
  });

  it('should list the NOAA and EPA origins and set a dataset per depth', () => {
    const result = buildOceanHeatContentData({
      depths: [depth('700m', { updatedAt: '2026-11-01T00:00:00.000Z' }), depth('2000m')],
      maxYear: 2025,
    });

    expect(result.data.unit).toBe('10²² J');
    expect(result.data.origins.map(({ producer }) => producer)).toEqual([
      'NOAA National Centers for Environmental Information',
      'United States Environmental Protection Agency',
    ]);
    expect(result.data.depths.map(({ dataset }) => dataset)).toEqual([
      { name: 'Climate Change Impacts - Annual', version: '2026-11-11' },
      { name: 'Climate Change Impacts - Annual', version: '2026-11-11' },
    ]);
    expect(result.lastUpdated).toBe('2026-11-11T21:16:32.000Z');
  });

  it('should throw ProviderDataError when the NOAA 2000 m column has no World values', () => {
    const broken = depth('2000m', {}, (sourceId, series) => (sourceId === 'noaa' ? [] : series));

    expect(() =>
      buildOceanHeatContentData({ depths: [depth('700m'), broken], maxYear: 2025 }),
    ).toThrow(/ocean_heat_content_noaa_2000m/);
  });

  it('should throw ProviderDataError when a source of the depth is not provided', () => {
    const missing = depth('700m');
    missing.sources = missing.sources.filter(({ id }) => id !== 'csiro');

    expect(() =>
      buildOceanHeatContentData({ depths: [missing, depth('2000m')], maxYear: 2025 }),
    ).toThrow(ProviderDataError);
  });

  it.each(['°C', '10²¹ J', 'J/m²'])('should throw ProviderDataError for the unit "%s"', (unit) => {
    expect(() =>
      buildOceanHeatContentData({
        depths: [depth('700m', { shortUnit: unit }), depth('2000m')],
        maxYear: 2025,
      }),
    ).toThrow(/unit/);
  });

  it('should throw ProviderDataError for an unknown depth', () => {
    const unknown = { ...depth('700m'), id: '9000m' as '700m' };

    expect(() => buildOceanHeatContentData({ depths: [unknown], maxYear: 2025 })).toThrow(
      /no depth/,
    );
  });

  it('should throw ProviderDataError when nothing has a value up to the cap', () => {
    expect(() => buildOceanHeatContentData(input(2000))).toThrow(/no value in any year/);
  });
});
