import type {
  ApiResponseMeta,
  GlobalTemperatureData,
  GlobalTemperatureEntity,
} from '@eco-metrics/shared';

/** Years 2020-2024; index 0 is 2020. */
export const TEMPERATURE_FIXTURE: GlobalTemperatureData = {
  startYear: 2020,
  endYear: 2024,
  unit: '°C',
  baseline: { startYear: 1991, endYear: 2020 },
  dataset: {
    name: 'Annual surface temperatures and anomalies by country',
    version: '2026-10-12',
  },
  origin: {
    producer: 'Copernicus Climate Change Service (C3S)',
    title: 'ERA5 monthly averaged data on single levels from 1940 to present',
    url: 'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means',
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    notice: 'Contains modified Copernicus Climate Change Service information (2026)',
    citation: 'Hersbach et al. (2023), ERA5, doi:10.24381/cds.f17050d7',
    disclaimer:
      'Neither the European Commission nor ECMWF is responsible for any use that may be made of the Copernicus information or data it contains.',
  },
  entities: [
    {
      code: 'OWID_WRL',
      iso2: null,
      name: 'World',
      // Trailing null: the latest year must fall back to 2023. The maximum is 2022.
      anomaly: [0.01, 0.35, 0.72, 0.6, null],
    },
    {
      code: 'ARG',
      iso2: 'AR',
      name: 'Argentina',
      // A negative value and a missing year.
      anomaly: [-0.45, 0.2, null, 0.8, 0],
    },
    {
      code: 'OWID_KOS',
      iso2: 'XK',
      name: 'Kosovo',
      anomaly: [0.1, 0.2, 0.3, 0.4, 0.5],
    },
    {
      code: 'USA',
      iso2: 'US',
      name: 'United States',
      anomaly: [-0.1, -0.2, 0.3, 0.4, 0.5],
    },
  ],
  global: {
    startYear: 1850,
    endYear: 1854,
    baseline: { startYear: 1861, endYear: 1890 },
    // Trailing null: the latest year must fall back to 1853. The maximum is 1853.
    mean: [-0.06, 0.1, -0.1, 0.5, null],
    lower: [-0.24, 0, -0.2, 0.4, null],
    upper: [0.11, 0.2, 0, 0.6, null],
    dataset: { name: 'Climate Change Impacts - Annual', version: '2026-10-12' },
    origin: {
      producer: 'Met Office Hadley Centre',
      title: 'HadCRUT5',
      url: 'https://www.metoffice.gov.uk/hadobs/hadcrut5/',
      license: {
        name: 'Open Government Licence v3.0',
        url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
      },
      notice:
        '© British Crown Copyright, Met Office, provided under the Open Government Licence v3.0',
      citation:
        'Morice et al. (2021), Journal of Geophysical Research: Atmospheres, 126, e2019JD032361, doi:10.1029/2019JD032361',
    },
  },
};

export const TEMPERATURE_META: ApiResponseMeta = {
  source: {
    provider: 'Our World in Data',
    license: 'CC BY 4.0',
    sourceUrl: 'https://ourworldindata.org',
    lastUpdated: '2026-10-13T08:42:32.000Z',
  },
  fetchedAt: '2026-10-25T12:00:00.000Z',
};

export function temperatureEntity(code: string): GlobalTemperatureEntity {
  const found = TEMPERATURE_FIXTURE.entities.find((entity) => entity.code === code);
  if (!found) {
    throw new Error(`No fixture entity ${code}`);
  }
  return found;
}
