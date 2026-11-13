import { readFileSync } from 'fs';

jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  readFileSync: jest.fn(),
}));

import { StaticDataSource } from '@eco-metrics/shared';

import { WasteRecyclingService } from '../../src/modules/waste-recycling/waste-recycling.service';

const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

const treatment = {
  year: 2022,
  shares: {
    recycling: 50,
    composting: null,
    incineration: 50,
    sanitaryLandfill: null,
    otherLandfill: null,
    openDump: null,
    uncollected: null,
    other: null,
  },
};
const composition = {
  year: 2020,
  shares: { foodOrganic: 60, paperCardboard: 10, plastic: 10, glass: 10, metal: 5, other: 5 },
};
const generation = {
  kgPerPersonPerDay2022: 1,
  tonnes2022: 10,
  tonnes2030: 11,
  tonnes2040: 12,
  tonnes2050: 13,
  reportedYear: null,
};
const country = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  code: 'AAA',
  iso2: null,
  name: 'Aland',
  population: 1000,
  generation,
  treatment,
  composition,
  ...overrides,
});
const dataset = (countries: unknown[] = [country()]): Record<string, unknown> => ({
  lastUpdated: '2026-03-11',
  retrieved: '2026-11-11',
  world: {
    generation: {
      kgPerPersonPerDay2022: 1,
      tonnes2022: 10,
      tonnes2030: 11,
      tonnes2040: 12,
      tonnes2050: 13,
    },
    recycling: { sharePercent: 50, countries: 1, populationSharePercent: 100 },
  },
  countries,
});

const load = (value: unknown): WasteRecyclingService => {
  mockReadFileSync.mockReturnValue(JSON.stringify(value));
  return new WasteRecyclingService();
};

describe('WasteRecyclingService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should serve the countries and the world without the dataset dates', () => {
    const service = load(dataset());

    expect(service.getData()).toEqual({
      dataset: {
        title: expect.stringContaining('What a Waste 3.0'),
        citation: expect.stringContaining('Cook, Ed'),
      },
      world: dataset().world,
      countries: [country()],
    });
    expect(service.getData()).not.toHaveProperty('lastUpdated');
  });

  it('should expose the update and retrieval dates of the dataset', () => {
    expect(load(dataset()).getDates()).toEqual({
      lastUpdated: '2026-03-11',
      retrieved: '2026-11-11',
    });
  });

  it('should accept a country without treatment, composition and population', () => {
    const bare = country({ population: null });
    delete bare.treatment;
    delete bare.composition;

    expect(load(dataset([bare])).getData().countries).toEqual([bare]);
  });

  it('should throw naming the file when it cannot be read', () => {
    mockReadFileSync.mockImplementation(() => {
      throw Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' });
    });

    expect(() => new WasteRecyclingService()).toThrow(/Failed to load waste recycling data/);
  });

  it('should throw when the file is not valid JSON', () => {
    mockReadFileSync.mockReturnValue('{ invalid');

    expect(() => new WasteRecyclingService()).toThrow(/Failed to load waste recycling data/);
  });

  it('should coerce a non-Error failure into the message', () => {
    mockReadFileSync.mockImplementation(() => {
      throw 'disk on fire';
    });

    expect(() => new WasteRecyclingService()).toThrow(/disk on fire/);
  });

  describe('shape validation', () => {
    const bad = (label: string, value: unknown): [string, unknown] => [label, value];

    it.each([
      bad('null', null),
      bad('an array', []),
      bad('no countries', dataset([])),
      bad('a malformed date', { ...dataset(), retrieved: 'yesterday' }),
      bad('a missing world block', { ...dataset(), world: null }),
      bad('a non-numeric world field', {
        ...dataset(),
        world: { generation: {}, recycling: {} },
      }),
      bad('a country without a name', dataset([country({ name: 1 })])),
      bad('a country with a non-numeric generation', dataset([country({ generation: {} })])),
      bad(
        'a treatment missing a group',
        dataset([country({ treatment: { year: 2022, shares: { recycling: 100 } } })]),
      ),
      bad(
        'a treatment with only unreported groups',
        dataset([
          country({
            treatment: {
              year: 2022,
              shares: Object.fromEntries(Object.keys(treatment.shares).map((k) => [k, null])),
            },
          }),
        ]),
      ),
      bad('a composition without a year', dataset([country({ composition: { shares: {} } })])),
      bad('a treatment that is not an object', dataset([country({ treatment: 5 })])),
    ])('should refuse a dataset with %s', (_label, value) => {
      mockReadFileSync.mockReturnValue(JSON.stringify(value));

      expect(() => new WasteRecyclingService()).toThrow(/unexpected shape/);
    });
  });

  describe('getDataSources', () => {
    it('should declare one static dataset with the World Bank publication and its license', () => {
      const [contribution] = load(
        dataset([country(), country({ code: 'BBB', name: 'B' })]),
      ).getDataSources();
      const source = contribution.source as StaticDataSource;

      expect(contribution.kind).toBe('dataset');
      expect(source).toMatchObject({ id: 'waste-recycling', categories: ['waste-recycling'] });
      expect(source).not.toHaveProperty('lastUpdated');
      expect(source.publications).toEqual([
        {
          citation: expect.stringContaining('What a Waste 3.0'),
          url: 'https://datacatalog.worldbank.org/search/dataset/0039597/What-a-Waste-Global-Database',
          publishedYear: 2026,
          entryCount: 2,
          license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
        },
      ]);
      expect(source.publications[0]).not.toHaveProperty('publisher');
    });
  });
});
