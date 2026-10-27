import type {
  ApiResponseMeta,
  EnergySourceId,
  EnergySourcesData,
  EnergySourcesEntity,
} from '@eco-metrics/shared';

type Generation = Record<EnergySourceId, (number | null)[]>;

const NONE: (number | null)[] = [null, null, null];

/** Years 2023-2025; index 0 is 2023. */
export const ENERGY_FIXTURE: EnergySourcesData = {
  startYear: 2023,
  endYear: 2025,
  unit: 'TWh',
  dataset: { name: 'Electricity mix', version: '2026-06-30' },
  origin: {
    producer: 'Ember',
    title: 'Yearly Electricity Data',
    url: 'https://ember-energy.org/data/yearly-electricity-data/',
    license: { name: 'CC BY 4.0', url: 'https://ember-energy.org/creative-commons/' },
  },
  entities: [
    {
      code: 'OWID_WRL',
      iso2: null,
      name: 'World',
      generation: {
        coal: [10000, 10200, 10471.53],
        gas: [6500, 6700, 6921.14],
        oil: [900, 880, 841.62],
        nuclear: [2700, 2750, 2811.57],
        hydro: [4300, 4400, 4434.97],
        wind: [2300, 2500, 2713.14],
        solar: [2000, 2400, 2778.64],
        bioenergyOther: [750, 780, 799.73],
      },
    },
    {
      // Stopped reporting after 2024: the latest year is 2024, not the payload's 2025.
      code: 'DZA',
      iso2: 'DZ',
      name: 'Algeria',
      generation: {
        coal: [0, 0, null],
        gas: [80, 82, null],
        oil: [1, 1, null],
        nuclear: NONE,
        hydro: [0.1, 0.1, null],
        wind: NONE,
        solar: NONE,
        bioenergyOther: NONE,
      },
    },
    {
      code: 'ARG',
      iso2: 'AR',
      name: 'Argentina',
      generation: {
        coal: [1.5, 1, 2],
        gas: [70, 75, 80],
        oil: [3, 2, 1],
        nuclear: [8, 9, 10],
        hydro: [30, 32, 33],
        wind: [12, 13, 14],
        solar: [2, 3, 4],
        bioenergyOther: [1, 1, 1],
      },
    },
    {
      // No gas, nuclear, wind, solar or bioenergy at all.
      code: 'BIH',
      iso2: 'BA',
      name: 'Bosnia and Herzegovina',
      generation: {
        coal: [5, 5, 5],
        gas: NONE,
        oil: [0.1, 0.1, 0.1],
        nuclear: NONE,
        hydro: [5, 6, 7],
        wind: NONE,
        solar: NONE,
        bioenergyOther: NONE,
      },
    },
  ],
};

export const ENERGY_META: ApiResponseMeta = {
  source: {
    provider: 'Our World in Data',
    license: 'CC BY 4.0',
    sourceUrl: 'https://ourworldindata.org',
    lastUpdated: '2026-09-10T01:11:13.000Z',
  },
  fetchedAt: '2026-10-26T12:00:00.000Z',
};

export function energyEntity(code: string): EnergySourcesEntity {
  const found = ENERGY_FIXTURE.entities.find((entity) => entity.code === code);
  if (!found) {
    throw new Error(`No fixture entity ${code}`);
  }
  return found;
}

/** An entity with the given generation; unlisted sources are blank for every year. */
export function entityWith(
  generation: Partial<Generation>,
): Pick<EnergySourcesEntity, 'generation'> {
  const length = Object.values(generation)[0]?.length ?? 1;
  const blank = Array.from({ length }, () => null);
  return {
    generation: {
      coal: blank,
      gas: blank,
      oil: blank,
      nuclear: blank,
      hydro: blank,
      wind: blank,
      solar: blank,
      bioenergyOther: blank,
      ...generation,
    },
  };
}
