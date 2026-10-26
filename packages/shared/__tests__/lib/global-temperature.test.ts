import type {
  ApiResponse,
  CountryEntity,
  DataSourceOrigin,
  DatasetIdentity,
  GlobalTemperatureData,
  GlobalTemperatureEntity,
  GlobalTemperatureGlobal,
} from '../../src';

describe('country series shared types', () => {
  it('should accept a null iso2 for World', () => {
    const world: CountryEntity = { code: 'OWID_WRL', iso2: null, name: 'World' };

    expect(world.iso2).toBeNull();
  });

  it('should describe a dataset by name and version', () => {
    const dataset: DatasetIdentity = { name: 'A dataset', version: '2026-10-12' };

    expect(dataset.version).toBe('2026-10-12');
  });
});

describe('global temperature wire types', () => {
  it('should accept negative numbers and null in the anomaly array', () => {
    const entity: GlobalTemperatureEntity = {
      code: 'ARG',
      iso2: 'AR',
      name: 'Argentina',
      anomaly: [-0.45, null, 0, 0.59],
    };

    expect(entity.anomaly[0]).toBe(-0.45);
    expect(entity.anomaly[1]).toBeNull();
  });

  it('should accept a null iso2 for World', () => {
    const world: GlobalTemperatureEntity = {
      code: 'OWID_WRL',
      iso2: null,
      name: 'World',
      anomaly: [0.1],
    };

    expect(world.iso2).toBeNull();
  });

  it('should accept negative numbers and null in the global series', () => {
    const lower: GlobalTemperatureGlobal['lower'] = [-1.2, null];

    expect(lower[0]).toBe(-1.2);
    expect(lower[1]).toBeNull();
  });

  it('should type the endpoint success envelope with meta', () => {
    const origin: DataSourceOrigin = {
      producer: 'Copernicus Climate Change Service (C3S)',
      title: 'ERA5 monthly averaged data on single levels from 1940 to present',
      url: 'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means',
      license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
      notice: 'Contains modified Copernicus Climate Change Service information (2026)',
      disclaimer: 'Neither the European Commission nor ECMWF is responsible for any use.',
    };
    const global: GlobalTemperatureGlobal = {
      startYear: 1850,
      endYear: 1852,
      baseline: { startYear: 1861, endYear: 1890 },
      mean: [-0.4, null, 0.1],
      lower: [-0.5, null, 0],
      upper: [-0.3, null, 0.2],
      dataset: { name: 'Climate Change Impacts - Annual', version: '2026-10-12' },
      origin: {
        producer: 'Met Office Hadley Centre',
        title: 'HadCRUT5',
        url: 'https://www.metoffice.gov.uk/hadobs/hadcrut5/',
        license: {
          name: 'Open Government Licence v3.0',
          url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
        },
      },
    };
    const data: GlobalTemperatureData = {
      startYear: 1940,
      endYear: 1940,
      unit: '°C',
      baseline: { startYear: 1991, endYear: 2020 },
      dataset: { name: 'Annual surface temperatures', version: '2026-10-12' },
      origin,
      entities: [],
      global,
    };
    const response: ApiResponse<GlobalTemperatureData> = {
      success: true,
      status: 200,
      data,
      meta: {
        source: {
          provider: 'Our World in Data',
          license: 'CC BY 4.0',
          sourceUrl: 'https://ourworldindata.org',
          lastUpdated: '2026-10-13T08:42:32.000Z',
        },
        fetchedAt: '2026-10-25T00:00:00.000Z',
      },
    };

    expect(response.success).toBe(true);
    if (response.success) {
      expect(response.data.baseline.startYear).toBe(1991);
      expect(response.meta?.source.provider).toBe('Our World in Data');
    }
  });
});
