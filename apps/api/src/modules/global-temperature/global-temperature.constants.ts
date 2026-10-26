import { DataSourceOrigin, ECO_CATEGORIES, EcoCategory } from '@eco-metrics/shared';

export const GLOBAL_TEMPERATURE_CATEGORY: EcoCategory = ECO_CATEGORIES.GLOBAL_TEMPERATURE;

/**
 * Annual temperature anomaly of every country and the world. The chart opens on
 * its map tab, so requests must name the chart tab explicitly (see the service).
 */
export const TEMPERATURE_ANOMALY_CHART = {
  slug: 'annual-temperature-anomalies',
  column: 'temperature_anomaly',
  indicatorId: 1325256,
} as const;

/** First year served per country; the provider's full span. */
export const GLOBAL_TEMPERATURE_START_YEAR = 1940;

/** Anomalies are served in degrees Celsius, rounded to two decimals. */
export const GLOBAL_TEMPERATURE_DECIMALS = 2;
export const GLOBAL_TEMPERATURE_UNIT = '°C';

/** Reference period of the per-country anomalies (the provider's own baseline). */
export const GLOBAL_TEMPERATURE_BASELINE = { startYear: 1991, endYear: 2020 } as const;

/**
 * The World's temperature since 1850 against the pre-industrial baseline, with
 * its 95% confidence bounds. One chart, three columns (one download).
 */
export const GLOBAL_SERIES_CHART = {
  slug: 'temperature-anomaly',
  columns: {
    mean: 'near_surface_temperature_anomaly',
    lower: 'near_surface_temperature_anomaly_lower',
    upper: 'near_surface_temperature_anomaly_upper',
  },
  /** The mean's indicator; its short description states the baseline. */
  indicatorId: 1325020,
} as const;

export const GLOBAL_SERIES_START_YEAR = 1850;

/** OWID's pre-industrial baseline, as recommended by the source. */
export const GLOBAL_SERIES_BASELINE = { startYear: 1861, endYear: 1890 } as const;

/**
 * Upstream producer of the per-country series. Its license (CC BY 4.0 on the
 * Climate Data Store page; the Copernicus license text asks for the same credit)
 * allows any lawful use, commercial included, with the notice and the
 * no-liability statement. The payload completes the notice with the dataset
 * year; the catalog lists it as is, since it is built without calling the provider.
 */
export const ERA5_ORIGIN: DataSourceOrigin = {
  producer: 'Copernicus Climate Change Service (C3S)',
  title: 'ERA5 monthly averaged data on single levels from 1940 to present',
  url: 'https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means',
  license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  notice: 'Contains modified Copernicus Climate Change Service information',
  citation:
    'Hersbach et al. (2023), ERA5 monthly averaged data on single levels from 1940 to present, ' +
    'Copernicus Climate Change Service (C3S) Climate Data Store (CDS), ' +
    'doi:10.24381/cds.f17050d7',
  disclaimer:
    'Neither the European Commission nor ECMWF is responsible for any use that may be made of ' +
    'the Copernicus information or data it contains.',
};

/** Upstream producer of the long-run global series (Crown copyright, Open Government Licence). */
export const HADCRUT5_ORIGIN: DataSourceOrigin = {
  producer: 'Met Office Hadley Centre',
  title: 'HadCRUT5',
  url: 'https://www.metoffice.gov.uk/hadobs/hadcrut5/',
  license: {
    name: 'Open Government Licence v3.0',
    url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  },
  notice: '© British Crown Copyright, Met Office, provided under the Open Government Licence v3.0',
  citation:
    'Morice et al. (2021), Journal of Geophysical Research: Atmospheres, 126, e2019JD032361, ' +
    'doi:10.1029/2019JD032361',
};
