import { DataSourceOrigin, ECO_CATEGORIES, EcoCategory } from '@eco-metrics/shared';

export const OCEAN_HEALTH_CATEGORY: EcoCategory = ECO_CATEGORIES.OCEAN_HEALTH;

/** One snapshot per section: a provider outage only affects its own section. */
export const OCEAN_HEALTH_SNAPSHOT_KEYS = {
  seaSurfaceTemperature: 'ocean-health-sea-surface-temperature',
  seaSurfaceAnomaly: 'ocean-health-sea-surface-anomaly',
  heatContent: 'ocean-health-heat-content',
  seaLevel: 'ocean-health-sea-level',
  ph: 'ocean-health-ph',
} as const;

/** Daily sea surface temperature (Copernicus Climate Pulse). */
export const OCEAN_SST_DAILY_UNIT = '°C';
export const OCEAN_SST_DAILY_COVERAGE = '60°S–60°N';
export const OCEAN_SST_DAILY_BASELINE = { startYear: 1991, endYear: 2020 } as const;
/** Day-of-year slots of every year: the index is the day of the year in a leap year. */
export const OCEAN_SST_DAILY_SLOTS = 366;
/** Number of most recent days listed in the data table. */
export const OCEAN_SST_DAILY_RECENT_DAYS = 90;

/**
 * Annual sea surface temperature anomaly (HadSST through OWID). Requests name the chart tab
 * and the three regions: the default filtered request answers with World only.
 */
export const OCEAN_SST_ANOMALY_CHART = {
  slug: 'sea-surface-temperature-anomaly',
  columns: {
    mean: 'sea_temperature_anomaly_annual',
    lower: 'sea_temperature_anomaly_low_annual',
    upper: 'sea_temperature_anomaly_high_annual',
  },
  /** The mean's indicator; its short description states the baseline. */
  indicatorId: 1357160,
} as const;

export const OCEAN_SST_ANOMALY_UNIT = '°C';
export const OCEAN_SST_ANOMALY_DECIMALS = 2;
/** OWID re-bases HadSST on the pre-industrial period (1861-1890). */
export const OCEAN_SST_ANOMALY_BASELINE = { startYear: 1861, endYear: 1890 } as const;
/** World first, then the hemispheres. */
export const OCEAN_SST_ANOMALY_REGIONS = [
  { code: 'OWID_WRL', name: 'World' },
  { code: 'OWID_NH', name: 'Northern Hemisphere' },
  { code: 'OWID_SH', name: 'Southern Hemisphere' },
] as const;

/** Ocean heat content of the World, in `10²² J`, from two charts (one per depth). */
export const OCEAN_HEAT_UNIT = '10²² J';
export const OCEAN_HEAT_DECIMALS = 2;
export const OCEAN_HEAT_DEPTHS = [
  {
    id: '700m',
    label: '0–700 m',
    slug: 'ocean-heat-content-upper',
    /** Indicator whose metadata identifies the dataset and carries the unit. */
    indicatorId: 1357159,
    sources: [
      { id: 'iap', name: 'IAP' },
      { id: 'noaa', name: 'NOAA' },
      { id: 'mri', name: 'MRI/JMA' },
      { id: 'csiro', name: 'CSIRO' },
    ],
  },
  {
    id: '2000m',
    label: '0–2000 m',
    slug: 'ocean-heat-top-2000m',
    indicatorId: 1357158,
    sources: [
      { id: 'noaa', name: 'NOAA' },
      { id: 'mri', name: 'MRI/JMA' },
      { id: 'iap', name: 'IAP' },
    ],
  },
] as const;

/** Column short name of a source at a depth, e.g. `ocean_heat_content_noaa_2000m`. */
export function heatContentColumn(sourceId: string, depthId: string): string {
  return `ocean_heat_content_${sourceId}_${depthId}`;
}

/** Ocean pH at Hawaii (HOT through OWID): a date-indexed chart. */
export const OCEAN_PH_CHART = {
  slug: 'seawater-ph',
  columns: { yearlyAverage: 'ocean_ph_yearly_average', monthly: 'ocean_ph' },
  /** The monthly series' indicator, for the dataset identity and timestamp. */
  indicatorId: 1357137,
} as const;
export const OCEAN_PH_STATION = 'Hawaii';
export const OCEAN_PH_UNIT = 'pH';

/** Sea level in millimetres. */
export const OCEAN_SEA_LEVEL_UNIT = 'mm';
/** Decimals of the yearly means (the file itself has two). */
export const OCEAN_SEA_LEVEL_DECIMALS = 2;

/** Upstream producer of HadSST (Crown copyright, Open Government Licence v3.0). */
export const HADSST_ORIGIN: DataSourceOrigin = {
  producer: 'Met Office Hadley Centre',
  title: "HadSST (Hadley Centre's Sea Surface Temperature)",
  url: 'https://www.metoffice.gov.uk/hadobs/hadsst4/',
  license: {
    name: 'Open Government Licence v3.0',
    url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  },
  notice: '© British Crown Copyright, Met Office, provided under the Open Government Licence v3.0',
  citation:
    'Kennedy et al. (2019), An ensemble data set of sea-surface temperature change from 1850: ' +
    'the Met Office Hadley Centre HadSST.4.0.0.0 data set, Journal of Geophysical Research: ' +
    'Atmospheres, 124, doi:10.1029/2018JD029867',
};

/**
 * Upstream producers of the ocean heat content series. The licenses are the ones OWID
 * records in the indicator metadata (`origins[].license`).
 */
export const OCEAN_HEAT_NOAA_ORIGIN: DataSourceOrigin = {
  producer: 'NOAA National Centers for Environmental Information',
  title: 'Heat Content Basin Time Series',
  url: 'https://www.ncei.noaa.gov/products/ocean-heat-salt-sea-level',
  license: {
    name: 'CC BY 4.0',
    url: 'https://www.ncei.noaa.gov/sites/g/files/anmtlf171/files/2023-12/NCEI%20PD-10-2-02%20-%20Open%20Data%20Policy%20Signed.pdf',
  },
  notice: 'NOAA National Centers for Environmental Information, Heat Content Basin Time Series',
  citation:
    'Levitus et al. (2017), NCEI ocean heat content, temperature anomalies, salinity anomalies, ' +
    'thermosteric sea level anomalies, halosteric sea level anomalies, and total steric sea ' +
    'level anomalies from 1955 to present calculated from in situ oceanographic subsurface ' +
    'profile data (NCEI Accession 0164586), doi:10.7289/v53f4mvp',
};

export const OCEAN_HEAT_EPA_ORIGIN: DataSourceOrigin = {
  producer: 'United States Environmental Protection Agency',
  title: 'Climate Change Indicators: Ocean Heat',
  url: 'https://www.epa.gov/climate-indicators/climate-change-indicators-ocean-heat',
  license: { name: 'Public domain', url: 'https://edg.epa.gov/epa_data_license.html' },
  notice: 'EPA, Climate Change Indicators: Ocean Heat (2021), based on various sources',
  citation:
    'EPA (2021), Climate Change Indicators: Ocean Heat. Series by NOAA (Levitus et al. 2012), ' +
    'CSIRO (Domingues et al. 2008, Nature 453:1090-1094), IAP (Cheng et al. 2017, Science ' +
    'Advances 3(3):e1601545) and MRI/JMA',
};

/** Upstream producer of the ocean pH series (license as recorded by OWID). */
export const HOT_ORIGIN: DataSourceOrigin = {
  producer: 'School of Ocean & Earth Science & Technology',
  title: 'Hawaii Ocean Time-series',
  url: 'https://hahana.soest.hawaii.edu/hot/',
  license: { name: 'Public domain', url: 'https://hahana.soest.hawaii.edu/hot/dataaccess.html' },
  notice:
    'Hawaii Ocean Time-series (HOT), School of Ocean and Earth Science and Technology, ' +
    "University of Hawai'i at Manoa",
  citation:
    'Dore et al. (2009), Physical and biogeochemical modulation of ocean acidification in the ' +
    'central North Pacific, Proc Natl Acad Sci USA 106:12235-12240',
};
