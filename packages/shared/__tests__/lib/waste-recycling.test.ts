import type {
  WasteComposition,
  WasteCompositionGroup,
  WasteCountry,
  WasteGeneration,
  WasteRecyclingData,
  WasteTreatment,
  WasteTreatmentGroup,
} from '../../src/index';

const generation: WasteGeneration = {
  kgPerPersonPerDay2022: 1.63,
  tonnes2022: 49_000_000,
  tonnes2030: 50_000_000,
  tonnes2040: 51_000_000,
  tonnes2050: 52_000_000,
  reportedYear: 2022,
};

const treatment: WasteTreatment = {
  year: 2022,
  shares: {
    recycling: 47,
    composting: 22,
    incineration: 30,
    sanitaryLandfill: 1,
    otherLandfill: null,
    openDump: null,
    uncollected: null,
    other: null,
  },
};

describe('waste recycling wire types', () => {
  it('should list the treatment and composition groups', () => {
    const treatmentGroups: WasteTreatmentGroup[] = [
      'recycling',
      'composting',
      'incineration',
      'sanitaryLandfill',
      'otherLandfill',
      'openDump',
      'uncollected',
      'other',
    ];
    const compositionGroups: WasteCompositionGroup[] = [
      'foodOrganic',
      'paperCardboard',
      'plastic',
      'glass',
      'metal',
      'other',
    ];

    expect(treatmentGroups).toHaveLength(8);
    expect(compositionGroups).toHaveLength(6);
  });

  it('should compile a country with treatment and composition, each with its year', () => {
    const composition: WasteComposition = {
      year: 2021,
      shares: {
        foodOrganic: 40,
        paperCardboard: 20,
        plastic: 10,
        glass: 10,
        metal: null,
        other: 20,
      },
    };
    const country: WasteCountry = {
      code: 'DEU',
      iso2: 'DE',
      name: 'Germany',
      population: 83_000_000,
      generation,
      treatment,
      composition,
    };

    expect(country.treatment?.shares.recycling).toBe(47);
    expect(country.composition?.shares.metal).toBeNull();
  });

  it('should compile a country without treatment or composition', () => {
    const country: WasteCountry = {
      code: 'NGA',
      iso2: 'NG',
      name: 'Nigeria',
      population: null,
      generation,
    };

    expect(country.treatment).toBeUndefined();
    expect(country.composition).toBeUndefined();
  });

  it('should fail type-checking when a treatment group is missing', () => {
    const incomplete: WasteTreatment = {
      year: 2022,
      // @ts-expect-error the `openDump` share is missing
      shares: {
        recycling: 47,
        composting: 22,
        incineration: 30,
        sanitaryLandfill: 1,
        otherLandfill: null,
        uncollected: null,
        other: null,
      },
    };

    expect(incomplete.year).toBe(2022);
  });

  it('should compile a payload with the world generation and the recycling summary', () => {
    const data: WasteRecyclingData = {
      dataset: { title: 'What a Waste 3.0', citation: 'Cook, Ed et al. 2026.' },
      world: {
        generation: {
          kgPerPersonPerDay2022: 0.8,
          tonnes2022: 2_330_000_000,
          tonnes2030: 2_600_000_000,
          tonnes2040: 3_000_000_000,
          tonnes2050: 3_490_000_000,
        },
        recycling: { sharePercent: 17.6, countries: 130, populationSharePercent: 46 },
      },
      countries: [],
    };

    expect(data.world.recycling.countries).toBe(130);
    expect(data.dataset.citation).toContain('2026');
  });
});
