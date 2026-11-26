import { ProviderDataError } from '../../src/common/errors/provider-error';
import { buildOceanPhData } from '../../src/modules/ocean-health/ocean-ph.service';
import type {
  OwidDatedSeries,
  OwidIndicatorMetadata,
} from '../../src/modules/providers/owid/owid.types';
import {
  parseGrapherDatedTable,
  selectDatedColumns,
} from '../../src/modules/providers/owid/parseGrapherCsv';

import { fixture } from './helpers';

const metadata: OwidIndicatorMetadata = {
  id: 1357137,
  name: 'Monthly measurement of ocean pH levels',
  unit: 'pH',
  shortUnit: 'pH',
  datasetName: 'Climate Change Impacts - Monthly',
  datasetVersion: '2026-11-11',
  timespan: '',
  updatedAt: '2026-11-11T21:16:30.000Z',
  descriptionShort: null,
  entities: [],
};

const fixtureSeries: OwidDatedSeries = selectDatedColumns(
  parseGrapherDatedTable(fixture('seawater-ph.csv')),
  ['ocean_ph_yearly_average', 'ocean_ph'],
);

describe('buildOceanPhData', () => {
  it('should align dates, monthly and rolling values with null for a blank cell', () => {
    const { data } = buildOceanPhData(fixtureSeries, metadata);

    expect(data.dates).toHaveLength(12);
    expect(data.monthly).toHaveLength(12);
    expect(data.yearlyAverage).toHaveLength(12);
    expect(data.dates[0]).toBe('1988-10-31');
    expect(data.monthly[0]).toBe(8.1097);
    expect(data.yearlyAverage[0]).toBeNull();
    expect(data.yearlyAverage.at(-1)).toBe(8.042414);
  });

  it('should describe the Hawaii Ocean Time-series with the indicator dataset and timestamp', () => {
    const result = buildOceanPhData(fixtureSeries, metadata);

    expect(result.data).toMatchObject({
      unit: 'pH',
      station: 'Hawaii',
      dataset: { name: 'Climate Change Impacts - Monthly', version: '2026-11-11' },
      origin: { title: 'Hawaii Ocean Time-series' },
    });
    expect(result.data.origin.producer).toBe('School of Ocean & Earth Science & Technology');
    expect(result.lastUpdated).toBe('2026-11-11T21:16:30.000Z');
  });

  it('should serve every row up to the latest month without a cap', () => {
    const { data } = buildOceanPhData(fixtureSeries, metadata);

    expect(data.dates.at(-1)).toBe('2024-12-20');
  });

  it('should keep a null monthly value next to a rolling one', () => {
    const series: OwidDatedSeries = {
      entityName: 'Hawaii',
      columns: [],
      rows: [
        { date: '2024-01-01', values: [null, 8.05] },
        { date: '2024-02-01', values: [8.04, null] },
      ],
    };

    const { data } = buildOceanPhData(series, metadata);

    expect(data.monthly).toEqual([8.05, null]);
    expect(data.yearlyAverage).toEqual([null, 8.04]);
  });

  it('should throw ProviderDataError for another entity', () => {
    expect(() => buildOceanPhData({ ...fixtureSeries, entityName: 'Bermuda' }, metadata)).toThrow(
      ProviderDataError,
    );
  });

  it('should throw ProviderDataError when no row has a monthly value', () => {
    const series: OwidDatedSeries = {
      entityName: 'Hawaii',
      columns: [],
      rows: [{ date: '2024-01-01', values: [8.05, null] }],
    };

    expect(() => buildOceanPhData(series, metadata)).toThrow(/no monthly value/);
  });
});
