import type { ApiResponseMeta, Co2EmissionsData, Co2EmissionsEntity } from '@eco-metrics/shared';

/** Years 2020-2024; index 0 is 2020. */
export const CO2_FIXTURE: Co2EmissionsData = {
  startYear: 2020,
  endYear: 2024,
  units: { total: 'Mt CO2', perCapita: 't CO2 per person' },
  dataset: { name: 'Global Carbon Budget', version: '2025-11-13' },
  origin: {
    producer: 'Global Carbon Project',
    title: 'Global Carbon Budget',
    url: 'https://globalcarbonbudget.org/',
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  },
  entities: [
    {
      code: 'OWID_WRL',
      iso2: null,
      name: 'World',
      total: [34807.1, 36900.55, 37150.2, 37600.8, 37800.4],
      // Trailing null: the key figures must fall back to 2023.
      perCapita: [4.45, 4.66, 4.67, 4.7, null],
    },
    {
      code: 'ARG',
      iso2: 'AR',
      name: 'Argentina',
      total: [160.5, 170.123, null, 175.9, 178.2],
      perCapita: [3.5, 3.7, null, 3.8, 3.85],
    },
    {
      code: 'OWID_KOS',
      iso2: 'XK',
      name: 'Kosovo',
      total: [0, 0, 0.004, 0.005, 0.005],
      perCapita: [0, 0.001, 0.005, 0.009, 0.01],
    },
    {
      code: 'CIV',
      iso2: 'CI',
      name: "Côte d'Ivoire",
      total: [8.1, 8.4, 8.9, 9.2, 9.5],
      perCapita: [0.3, 0.31, 0.32, 0.33, 0.34],
    },
    {
      code: 'USA',
      iso2: 'US',
      name: 'United States',
      total: [4500.2, 4800.6, 4780.1, 4700.4, 4650],
      perCapita: [13.6, 14.4, 14.3, 14, 13.8],
    },
  ],
};

export const CO2_META: ApiResponseMeta = {
  source: {
    provider: 'Our World in Data',
    license: 'CC BY 4.0',
    sourceUrl: 'https://ourworldindata.org',
    lastUpdated: '2026-10-22T21:47:04.000Z',
  },
  fetchedAt: '2026-10-24T12:00:00.000Z',
};

export function entityByCode(code: string): Co2EmissionsEntity {
  const found = CO2_FIXTURE.entities.find((entity) => entity.code === code);
  if (!found) {
    throw new Error(`No fixture entity ${code}`);
  }
  return found;
}
