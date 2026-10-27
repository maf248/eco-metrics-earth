import {
  ENERGY_SOURCE_IDS,
  RENEWABLE_SOURCE_IDS,
  type ApiResponse,
  type EnergySourceId,
  type EnergySourcesData,
  type EnergySourcesEntity,
} from '../../src';

function emptyGeneration(): Record<EnergySourceId, (number | null)[]> {
  return {
    coal: [1, null],
    gas: [null, null],
    oil: [null, null],
    nuclear: [null, null],
    hydro: [null, null],
    wind: [null, null],
    solar: [null, null],
    bioenergyOther: [null, null],
  };
}

describe('energy sources wire types', () => {
  it('should keep the eight sources in their fixed order', () => {
    expect(ENERGY_SOURCE_IDS).toEqual([
      'coal',
      'gas',
      'oil',
      'nuclear',
      'hydro',
      'wind',
      'solar',
      'bioenergyOther',
    ]);
  });

  it('should list renewables as a subset of the sources', () => {
    expect(RENEWABLE_SOURCE_IDS).toEqual(['hydro', 'wind', 'solar', 'bioenergyOther']);
    for (const id of RENEWABLE_SOURCE_IDS) {
      expect(ENERGY_SOURCE_IDS).toContain(id);
    }
  });

  it('should allow null elements and a null iso2 for World', () => {
    const world: EnergySourcesEntity = {
      code: 'OWID_WRL',
      iso2: null,
      name: 'World',
      generation: emptyGeneration(),
    };

    expect(world.iso2).toBeNull();
    expect(world.generation.gas[0]).toBeNull();
    expect(world.generation.coal[0]).toBe(1);
  });

  it('should reject an incomplete generation record at type-checking', () => {
    const incomplete: EnergySourcesEntity = {
      code: 'ARG',
      iso2: 'AR',
      name: 'Argentina',
      // @ts-expect-error the generation record lacks the other seven sources
      generation: { coal: [1] },
    };

    expect(Object.keys(incomplete.generation)).toEqual(['coal']);
  });

  it('should type the endpoint success envelope with meta', () => {
    const data: EnergySourcesData = {
      startYear: 2000,
      endYear: 2001,
      unit: 'TWh',
      dataset: { name: 'Electricity mix', version: '2026-06-30' },
      origin: {
        producer: 'Ember',
        title: 'Yearly Electricity Data',
        url: 'https://ember-energy.org/data/yearly-electricity-data/',
        license: { name: 'CC BY 4.0', url: 'https://ember-energy.org/creative-commons/' },
      },
      entities: [],
    };
    const response: ApiResponse<EnergySourcesData> = {
      success: true,
      status: 200,
      data,
      meta: {
        source: {
          provider: 'Our World in Data',
          license: 'CC BY 4.0',
          sourceUrl: 'https://ourworldindata.org',
          lastUpdated: '2026-09-10T01:11:13Z',
        },
        fetchedAt: '2026-10-26T00:00:00.000Z',
      },
    };

    expect(response.success).toBe(true);
  });
});
