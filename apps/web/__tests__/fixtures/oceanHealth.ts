import type {
  ApiResponseMeta,
  DataSourceOrigin,
  OceanHeatContentData,
  OceanPhData,
  OceanSeaLevelData,
  OceanSstAnomalyData,
  OceanSstDailyData,
  OceanSstDailyPoint,
} from '@eco-metrics/shared';

const SLOTS = 366;

/** A smooth, deterministic series so charts and tables have something to draw. */
function seasonal(base: number, amplitude: number, lastSlot: number): (number | null)[] {
  return Array.from({ length: SLOTS }, (_, slot) =>
    slot > lastSlot ? null : Number((base + amplitude * Math.sin(slot / 58)).toFixed(3)),
  );
}

export const COPERNICUS_ORIGIN: DataSourceOrigin = {
  producer: 'Copernicus Climate Change Service (C3S) / ECMWF',
  title: 'ERA5 daily sea surface temperature, 60°S-60°N (Climate Pulse)',
  url: 'https://pulse.climate.copernicus.eu',
  license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  notice: 'Contains modified Copernicus Climate Change Service information',
  citation: 'Hersbach et al. (2020), doi:10.1002/qj.3803',
  disclaimer: 'Neither the European Commission nor ECMWF is responsible for any use made of it.',
};

export const HADSST_ORIGIN: DataSourceOrigin = {
  producer: 'Met Office Hadley Centre',
  title: "HadSST (Hadley Centre's Sea Surface Temperature)",
  url: 'https://www.metoffice.gov.uk/hadobs/hadsst4/',
  license: {
    name: 'Open Government Licence v3.0',
    url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  },
  notice: '© British Crown Copyright, Met Office, provided under the Open Government Licence v3.0',
};

export const NOAA_NCEI_ORIGIN: DataSourceOrigin = {
  producer: 'NOAA National Centers for Environmental Information',
  title: 'Heat Content Basin Time Series',
  url: 'https://www.ncei.noaa.gov/products/ocean-heat-salt-sea-level',
  license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  notice: 'NOAA National Centers for Environmental Information, Heat Content Basin Time Series',
};

export const EPA_ORIGIN: DataSourceOrigin = {
  producer: 'United States Environmental Protection Agency',
  title: 'Climate Change Indicators: Ocean Heat',
  url: 'https://www.epa.gov/climate-indicators/climate-change-indicators-ocean-heat',
  license: { name: 'Public domain', url: 'https://edg.epa.gov/epa_data_license.html' },
  notice: 'EPA, Climate Change Indicators: Ocean Heat (2021), based on various sources',
  citation: 'Series by NOAA, CSIRO, IAP and MRI/JMA',
};

export const NOAA_LSA_ORIGIN: DataSourceOrigin = {
  producer: 'NOAA Laboratory for Satellite Altimetry',
  title: 'Sea level rise: global mean sea level anomaly from satellite altimetry',
  url: 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/',
  license: {
    name: 'Public domain',
    url: 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/LSA_productspolicy.php',
  },
  notice: 'Altimetry data are provided by NOAA Laboratory for Satellite Altimetry.',
  disclaimer: 'NOAA STAR provides these data and images for experimental use only.',
};

export const HOT_ORIGIN: DataSourceOrigin = {
  producer: 'School of Ocean & Earth Science & Technology',
  title: 'Hawaii Ocean Time-series',
  url: 'https://hahana.soest.hawaii.edu/hot/',
  license: { name: 'Public domain', url: 'https://hahana.soest.hawaii.edu/hot/dataaccess.html' },
  notice: "Hawaii Ocean Time-series (HOT), University of Hawai'i at Manoa",
};

const point = (date: string, sst: number, climatology: number): OceanSstDailyPoint => ({
  date,
  sst,
  climatology,
  anomaly: Number((sst - climatology).toFixed(3)),
  status: 'final',
});

/** 2022 and 2023 are full years, 2024 ends at slot 99 (9 April). The record is in 2023. */
export const OCEAN_SST_DAILY_FIXTURE: OceanSstDailyData = {
  unit: '°C',
  coverage: '60°S–60°N',
  baseline: { startYear: 1991, endYear: 2020 },
  startYear: 2022,
  endYear: 2024,
  years: [
    { year: 2022, values: seasonal(20.5, 0.4, 365) },
    { year: 2023, values: seasonal(20.7, 0.5, 365) },
    { year: 2024, values: seasonal(20.6, 0.45, 99) },
  ],
  climatology: seasonal(20.3, 0.4, 365),
  latest: point('2024-04-09', 20.875, 20.117),
  record: point('2023-08-24', 21.109, 20.35),
  recent: [
    point('2024-04-07', 20.86, 20.115),
    point('2024-04-08', 20.87, 20.116),
    point('2024-04-09', 20.875, 20.117),
  ],
  origin: COPERNICUS_ORIGIN,
};

export const OCEAN_SST_ANOMALY_FIXTURE: OceanSstAnomalyData = {
  startYear: 2020,
  endYear: 2024,
  unit: '°C',
  baseline: { startYear: 1861, endYear: 1890 },
  dataset: { name: 'Sea surface temperature anomaly', version: '2026-10-12' },
  origin: HADSST_ORIGIN,
  regions: [
    {
      code: 'OWID_WRL',
      name: 'World',
      mean: [0.8, 0.85, 0.9, 1.1, 1.2],
      lower: [0.75, 0.8, 0.85, 1.05, 1.15],
      upper: [0.85, 0.9, 0.95, 1.15, 1.25],
    },
    {
      code: 'OWID_NH',
      name: 'Northern Hemisphere',
      mean: [0.9, 0.95, 1, 1.3, 1.4],
      lower: [0.85, 0.9, 0.95, 1.25, 1.35],
      upper: [0.95, 1, 1.05, 1.35, 1.45],
    },
    {
      code: 'OWID_SH',
      name: 'Southern Hemisphere',
      mean: [-0.05, 0.1, null, 0.5, 0.6],
      lower: [-0.1, 0.05, null, 0.45, 0.55],
      upper: [0, 0.15, null, 0.55, 0.65],
    },
  ],
};

export const OCEAN_HEAT_FIXTURE: OceanHeatContentData = {
  startYear: 2020,
  endYear: 2024,
  unit: '10²² J',
  depths: [
    {
      id: '700m',
      label: '0–700 m',
      dataset: { name: 'Ocean heat content (upper)', version: '2026-06-01' },
      sources: [
        { id: 'iap', name: 'IAP', values: [10, 11, 12, 13, 14] },
        { id: 'noaa', name: 'NOAA', values: [8, 9, 10, 11, null] },
        { id: 'mri', name: 'MRI/JMA', values: [7, 8, 9, null, null] },
        { id: 'csiro', name: 'CSIRO', values: [null, null, null, null, null] },
      ],
    },
    {
      id: '2000m',
      label: '0–2000 m',
      dataset: { name: 'Ocean heat content (top 2000 m)', version: '2026-06-01' },
      sources: [
        { id: 'noaa', name: 'NOAA', values: [20, 21, 22, 23, 24] },
        { id: 'mri', name: 'MRI/JMA', values: [18, 19, 20, null, null] },
        { id: 'iap', name: 'IAP', values: [25, 26, 27, 28, 29] },
      ],
    },
  ],
  origins: [NOAA_NCEI_ORIGIN, EPA_ORIGIN],
};

/** A 1992–2025 year-aligned array with the given values and `null` elsewhere. */
function annualValues(byYear: Record<number, number>): (number | null)[] {
  return Array.from({ length: 2025 - 1992 + 1 }, (_, index) => byYear[1992 + index] ?? null);
}

export const OCEAN_SEA_LEVEL_FIXTURE: OceanSeaLevelData = {
  unit: 'mm',
  startDate: '1992-12-17',
  endDate: '2025-02-15',
  trend: {
    value: 3.11,
    unit: 'mm/year',
    note: 'no glacial isostatic adjustment correction',
  },
  missions: [
    {
      id: 'topex-poseidon',
      name: 'TOPEX/Poseidon',
      dates: ['1992-12-17', '1993-01-15'],
      values: [-19.33, -24.03],
    },
    {
      id: 'jason-3',
      name: 'Jason-3',
      dates: ['2024-12-20', '2025-01-18'],
      values: [101.5, 103.2],
    },
    {
      id: 'sentinel-6mf',
      name: 'Sentinel-6MF',
      dates: ['2025-01-18', '2025-02-15'],
      values: [103.1, 104.8],
    },
  ],
  annual: {
    startYear: 1992,
    endYear: 2025,
    missions: [
      {
        id: 'topex-poseidon',
        name: 'TOPEX/Poseidon',
        values: annualValues({ 1992: -19.33, 1993: -24.03 }),
      },
      { id: 'jason-3', name: 'Jason-3', values: annualValues({ 2024: 101.5, 2025: 103.2 }) },
      { id: 'sentinel-6mf', name: 'Sentinel-6MF', values: annualValues({ 2025: 103.95 }) },
    ],
  },
  origin: NOAA_LSA_ORIGIN,
};

export const OCEAN_PH_FIXTURE: OceanPhData = {
  unit: 'pH',
  station: 'Hawaii',
  dates: ['1988-10-31', '1988-12-02', '1990-01-08', '2024-12-20'],
  monthly: [8.1097, 8.1092, null, 8.0391],
  yearlyAverage: [null, null, 8.11, 8.0392],
  dataset: { name: 'Ocean pH', version: '2026-03-04' },
  origin: HOT_ORIGIN,
};

const OWID_SOURCE = {
  provider: 'Our World in Data',
  license: 'CC BY 4.0',
  sourceUrl: 'https://ourworldindata.org',
} as const;

export const COPERNICUS_META: ApiResponseMeta = {
  source: {
    provider: 'Copernicus Climate Pulse',
    license: 'CC BY 4.0',
    sourceUrl: 'https://pulse.climate.copernicus.eu',
    lastUpdated: '2026-11-24T00:00:00.000Z',
  },
  fetchedAt: '2026-11-24T08:00:00.000Z',
};

export const OWID_OCEAN_META: ApiResponseMeta = {
  source: { ...OWID_SOURCE, lastUpdated: '2026-10-13T08:42:32.000Z' },
  fetchedAt: '2026-11-24T08:00:00.000Z',
};

export const NOAA_LSA_META: ApiResponseMeta = {
  source: {
    provider: 'NOAA Laboratory for Satellite Altimetry',
    license: 'Public domain',
    sourceUrl: 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/',
    lastUpdated: '2026-11-24T08:00:00.000Z',
  },
  fetchedAt: '2026-11-24T08:00:00.000Z',
};
