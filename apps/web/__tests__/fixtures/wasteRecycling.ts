import type {
  ApiResponseMeta,
  WasteCountry,
  WasteRecyclingData,
  WasteTreatment,
} from '@eco-metrics/shared';

const NONE = {
  recycling: null,
  composting: null,
  incineration: null,
  sanitaryLandfill: null,
  otherLandfill: null,
  openDump: null,
  uncollected: null,
  other: null,
} as const;

const NO_COMPOSITION_SHARES = {
  foodOrganic: null,
  paperCardboard: null,
  plastic: null,
  glass: null,
  metal: null,
  other: null,
} as const;

function generation(kg: number, tonnes: number, reportedYear: number | null = 2022) {
  return {
    kgPerPersonPerDay2022: kg,
    tonnes2022: tonnes,
    tonnes2030: tonnes * 1.1,
    tonnes2040: tonnes * 1.2,
    tonnes2050: tonnes * 1.3,
    reportedYear,
  };
}

const treatment = (year: number, shares: Partial<WasteTreatment['shares']>): WasteTreatment => ({
  year,
  shares: { ...NONE, ...shares },
});

/** A small, hand-made slice of the dataset: reported, partly reported and missing shares. */
export const WASTE_COUNTRIES: WasteCountry[] = [
  {
    code: 'ARG',
    iso2: 'AR',
    name: 'Argentina',
    population: 45_000_000,
    generation: generation(1.17, 19_345_000),
    treatment: treatment(2020, {
      sanitaryLandfill: 64.7,
      otherLandfill: 24.6,
      openDump: 9.9,
      other: 0.8,
    }),
    composition: {
      year: 2023,
      shares: {
        foodOrganic: 39,
        paperCardboard: 13.7,
        plastic: 18.6,
        glass: 4.4,
        metal: 2,
        other: 22.3,
      },
    },
  },
  {
    code: 'BRA',
    iso2: 'BR',
    name: 'Brazil',
    population: 209_000_000,
    generation: generation(1.07, 81_811_506),
    treatment: treatment(2022, {
      recycling: 1.6,
      sanitaryLandfill: 67.4,
      otherLandfill: 10.9,
      openDump: 13.1,
      uncollected: 7,
    }),
    composition: {
      year: 2020,
      shares: {
        foodOrganic: 45.3,
        paperCardboard: 10.4,
        plastic: 16.8,
        glass: 2.7,
        metal: 2.3,
        other: 22.5,
      },
    },
  },
  {
    code: 'CHN',
    iso2: 'CN',
    name: 'China',
    population: 1_426_000_000,
    generation: generation(0.97, 502_607_448),
    treatment: treatment(2022, {
      incineration: 74.6,
      sanitaryLandfill: 18.4,
      uncollected: 0.3,
      other: 6.7,
    }),
    composition: {
      year: 2023,
      shares: {
        foodOrganic: 59.3,
        paperCardboard: 9.1,
        plastic: 12.1,
        glass: 3.2,
        metal: 0.7,
        other: 15.6,
      },
    },
  },
  {
    code: 'DEU',
    iso2: 'DE',
    name: 'Germany',
    population: 83_000_000,
    generation: generation(1.63, 49_699_000),
    treatment: treatment(2022, {
      recycling: 47,
      composting: 22.1,
      incineration: 29.5,
      sanitaryLandfill: 1.4,
    }),
    composition: {
      year: 2018,
      shares: {
        foodOrganic: 35.5,
        paperCardboard: 20.1,
        plastic: 8.5,
        glass: 7.6,
        metal: 1.9,
        other: 26.4,
      },
    },
  },
  {
    code: 'IND',
    iso2: 'IN',
    name: 'India',
    population: 1_419_000_000,
    generation: generation(0.4, 209_781_997, 2021),
    treatment: treatment(2020, { otherLandfill: 18.4, uncollected: 4.6, other: 77 }),
    composition: {
      year: 2021,
      shares: {
        foodOrganic: 44.9,
        paperCardboard: 7.4,
        plastic: 16,
        glass: 1.1,
        metal: 1.1,
        other: 29.5,
      },
    },
  },
  {
    code: 'NGA',
    iso2: 'NG',
    name: 'Nigeria',
    population: 220_000_000,
    generation: generation(0.57, 45_737_275, 2021),
    composition: { year: 2015, shares: { ...NO_COMPOSITION_SHARES, foodOrganic: 100 } },
  },
  {
    code: 'TUV',
    iso2: 'TV',
    name: 'Tuvalu',
    population: 11_000,
    generation: generation(0.6, 2_400, null),
  },
];

export const WASTE_FIXTURE: WasteRecyclingData = {
  dataset: {
    title:
      'What a Waste 3.0: Global Snapshot of Solid Waste Management Toward Circularity until 2050',
    citation: 'Cook, Ed et al. 2026. What a Waste 3.0. Washington, DC: World Bank Group.',
  },
  world: {
    generation: {
      kgPerPersonPerDay2022: 0.8,
      tonnes2022: 2_334_815_694,
      tonnes2030: 2_653_945_099,
      tonnes2040: 3_077_089_434,
      tonnes2050: 3_490_500_999,
    },
    recycling: { sharePercent: 17.63, countries: 130, populationSharePercent: 46.47 },
  },
  countries: WASTE_COUNTRIES,
};

export const WASTE_META: ApiResponseMeta = {
  source: {
    provider: 'World Bank',
    license: 'CC BY 4.0',
    sourceUrl:
      'https://datacatalog.worldbank.org/search/dataset/0039597/What-a-Waste-Global-Database',
    lastUpdated: '2026-03-11',
  },
  fetchedAt: '2026-11-11T00:00:00.000Z',
};

export function wasteCountry(code: string): WasteCountry {
  const found = WASTE_COUNTRIES.find((country) => country.code === code);
  if (!found) {
    throw new Error(`No fixture country ${code}`);
  }
  return found;
}
