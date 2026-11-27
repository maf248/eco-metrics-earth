import { DataSourcePublisher } from '@eco-metrics/shared';

/** Our World in Data, the single definition of its name and license. */
export const OWID_PUBLISHER: DataSourcePublisher = {
  provider: 'Our World in Data',
  license: 'CC BY 4.0',
  sourceUrl: 'https://ourworldindata.org',
};

/** Copernicus Climate Pulse (C3S, ERA5), the single definition of its name and license. */
export const COPERNICUS_CLIMATE_PULSE_PUBLISHER: DataSourcePublisher = {
  provider: 'Copernicus Climate Pulse',
  license: 'CC BY 4.0',
  sourceUrl: 'https://pulse.climate.copernicus.eu',
};

/** NOAA Laboratory for Satellite Altimetry, the single definition of its name and license. */
export const NOAA_LSA_PUBLISHER: DataSourcePublisher = {
  provider: 'NOAA Laboratory for Satellite Altimetry',
  license: 'Public domain',
  sourceUrl: 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/',
};
