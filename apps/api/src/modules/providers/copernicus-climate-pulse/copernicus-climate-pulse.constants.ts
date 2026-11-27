import type { DataSourceOrigin } from '@eco-metrics/shared';

/**
 * Upstream producer of the ERA5 reanalysis (the per-country temperature series
 * and, through Climate Pulse, the daily sea surface temperature). Its license
 * (CC BY 4.0 on the Climate Data Store page; the Copernicus license text asks for the same credit)
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

/** The daily sea surface temperature file, ocean only, 60°S-60°N. */
export const COPERNICUS_SST_FILE = 'era5_daily_series_sst_60S-60N_ocean.csv';

/** Exact header of the file: a different one means a different baseline or layout. */
export const COPERNICUS_SST_HEADER = 'date,sst,clim_91-20,ano_91-20,status';

/** The only unit the parser accepts (the `# Units:` line of the file). */
export const COPERNICUS_SST_UNIT_LINE = 'deg. C';

/**
 * Upstream producer of the daily series. Climate Pulse is derived from ERA5, so
 * the license, the credit line and the no-liability statement are those of
 * `ERA5_ORIGIN` (the Climate Data Store license); the Climate Pulse credits
 * page asks for clear attribution to the Copernicus programme, which that notice
 * gives. The citation is the one the credits page lists.
 */
export const COPERNICUS_CLIMATE_PULSE_ORIGIN: DataSourceOrigin = {
  ...ERA5_ORIGIN,
  producer: 'Copernicus Climate Change Service (C3S) / ECMWF',
  title: 'ERA5 daily sea surface temperature, 60°S-60°N (Climate Pulse)',
  url: 'https://pulse.climate.copernicus.eu',
  citation:
    'Hersbach et al. (2020), The ERA5 global reanalysis, Quarterly Journal of the Royal ' +
    'Meteorological Society, 146, doi:10.1002/qj.3803; ERA5 hourly data on single levels from ' +
    '1940 to present, Copernicus Climate Change Service (C3S) Climate Data Store (CDS), ' +
    'doi:10.24381/cds.adbb2d47',
};
