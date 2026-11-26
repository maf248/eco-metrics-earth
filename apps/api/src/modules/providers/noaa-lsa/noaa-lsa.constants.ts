import type { DataSourceOrigin } from '@eco-metrics/shared';

/** Global mean sea level anomaly per altimetry mission, annual signals removed. */
export const NOAA_LSA_FILE = 'slr_sla_gbl_free_ref_90.csv';

/**
 * Upstream producer of the sea level series: a U.S. Government work (17 U.S.C. §105,
 * public domain). The notice is the acknowledgment the file's own `#comment` header
 * asks for, verbatim. NOAA STAR labels its data and images "for experimental use only".
 */
export const NOAA_LSA_ORIGIN: DataSourceOrigin = {
  producer: 'NOAA Laboratory for Satellite Altimetry',
  title: 'Sea level rise: global mean sea level anomaly from satellite altimetry',
  url: 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/',
  license: {
    name: 'Public domain',
    url: 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/LSA_productspolicy.php',
  },
  notice: 'Altimetry data are provided by NOAA Laboratory for Satellite Altimetry.',
  disclaimer:
    'NOAA STAR provides these data and images for experimental use only; they are not ' +
    'official operational NOAA products.',
};
