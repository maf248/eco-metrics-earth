import { readFileSync } from 'fs';

import { BadRequestException, Logger } from '@nestjs/common';

import { StaticDataSource } from '@eco-metrics/shared';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

import { OWID_PUBLISHER } from '../../src/modules/providers/owid/owid.attribution';
import { WaterFootprintService } from '../../src/modules/water-footprint/water-footprint.service';

const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

describe('WaterFootprintService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockProducts = [
    {
      product: 'Apples',
      category: 'Food & Beverages',
      waterFootprintLiters: 180.1,
      unit: 'per kg',
      waterType: 'blue',
      source: 'Poore & Nemecek (2018), Science',
      sourceUrl: 'https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore',
      methodology:
        'Freshwater withdrawals per kg of final product. Based on ~38,700 farms in 119 countries.',
    },
    {
      product: 'Cotton (lint)',
      category: 'Textiles',
      waterFootprintLiters: 4030,
      unit: 'per kg',
      waterType: 'green-blue-grey',
      source: 'Mekonnen & Hoekstra (2011), Hydrology and Earth System Sciences',
      sourceUrl: 'https://waterfootprint.org/en/resources/waterstat/',
      methodology: 'Blue and green water footprint of cotton lint.',
    },
    {
      product: 'Bitcoin transaction',
      category: 'Digital & Computing',
      waterFootprintLiters: 16000,
      unit: 'per transaction',
      waterType: 'lifecycle-total',
      source: 'de Vries (2023), Cell Reports Sustainability',
      sourceUrl: 'https://doi.org/10.1016/j.crsus.2023.100004',
      methodology: 'Average water footprint per Bitcoin transaction in 2021.',
    },
  ];

  it('should return a defensive copy of all products', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(mockProducts));

    const service = new WaterFootprintService();
    const all = service.getAllProducts();

    expect(all).toEqual([
      { ...mockProducts[0], publisher: OWID_PUBLISHER },
      mockProducts[1],
      mockProducts[2],
    ]);
    expect(all).not.toBe(mockProducts);
  });

  it('should set the publisher only on rows hosted by a known licensor', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(mockProducts));

    const [apples, cotton] = new WaterFootprintService().getAllProducts();

    expect(apples.publisher).toEqual(OWID_PUBLISHER);
    expect(cotton).not.toHaveProperty('publisher');
  });

  it('should keep the publisher on rows filtered by category', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(mockProducts));

    const [apples] = new WaterFootprintService().getByCategory('food-beverages');

    expect(apples.publisher).toEqual(OWID_PUBLISHER);
  });

  it('should return only food products for the food-beverages slug', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(mockProducts));

    const service = new WaterFootprintService();
    const result = service.getByCategory('food-beverages');

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Food & Beverages');
  });

  it('should return only textile products for the textiles slug', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(mockProducts));

    const service = new WaterFootprintService();
    const result = service.getByCategory('textiles');

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Textiles');
  });

  it('should throw BadRequestException for an unknown category slug', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(mockProducts));

    const service = new WaterFootprintService();

    expect(() => service.getByCategory('unknown-slug')).toThrow(BadRequestException);
  });

  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])(
    'should throw BadRequestException for the inherited object key "%s"',
    (slug) => {
      mockReadFileSync.mockReturnValue(JSON.stringify(mockProducts));

      const service = new WaterFootprintService();

      expect(() => service.getByCategory(slug)).toThrow(BadRequestException);
    },
  );

  it('should return an empty array when a valid slug matches no products', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(mockProducts));

    const service = new WaterFootprintService();
    const result = service.getByCategory('manufactured');

    expect(result).toEqual([]);
  });

  it('should initialize with an empty dataset when the data file is missing (ENOENT)', () => {
    const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    mockReadFileSync.mockImplementation(() => {
      const error = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    });

    const service = new WaterFootprintService();

    expect(service.getAllProducts()).toEqual([]);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Water footprint data file not found'),
    );

    loggerWarnSpy.mockRestore();
  });

  it('should throw for non-ENOENT file errors (e.g. permission denied)', () => {
    mockReadFileSync.mockImplementation(() => {
      const error = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      throw error;
    });

    expect(() => new WaterFootprintService()).toThrow(/Failed to load water footprint data/);
  });

  it('should throw when the data file contains malformed JSON', () => {
    mockReadFileSync.mockReturnValue('{ invalid json');

    expect(() => new WaterFootprintService()).toThrow(/Failed to parse water footprint data/);
  });

  it.each([
    ['an object', '{ "product": "Apples" }'],
    ['null', 'null'],
    ['a string', '"products"'],
  ])('should throw when the data file contains %s instead of an array', (_label, payload) => {
    mockReadFileSync.mockReturnValue(payload);

    expect(() => new WaterFootprintService()).toThrow(/expected a JSON array of products/);
  });

  describe('construction validation', () => {
    const row = mockProducts[1];

    it.each([
      ['no year', 'Mekonnen & Hoekstra, Hydrology'],
      ['several years', 'Mekonnen (2011) & Hoekstra (2012), Hydrology'],
    ])('should throw naming the product and source when the citation has %s', (_label, source) => {
      mockReadFileSync.mockReturnValue(JSON.stringify([{ ...row, source }]));

      const construct = (): WaterFootprintService => new WaterFootprintService();

      expect(construct).toThrow('"Cotton (lint)"');
      expect(construct).toThrow(`"${source}"`);
    });

    it('should throw naming the product and source when the sourceUrl is unparsable', () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([{ ...row, sourceUrl: 'not a url' }]));

      const construct = (): WaterFootprintService => new WaterFootprintService();

      expect(construct).toThrow('"Cotton (lint)"');
      expect(construct).toThrow(`(source: "${row.source}")`);
    });
  });

  describe('getDataSources', () => {
    it('should group rows by citation and URL, counting entries and parsing the year', () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify([
          ...mockProducts,
          { ...mockProducts[0], product: 'Pears' },
          { ...mockProducts[0], product: 'Plums', sourceUrl: 'https://doi.org/10.1126/science' },
        ]),
      );

      const [contribution] = new WaterFootprintService().getDataSources();

      expect(contribution.kind).toBe('dataset');
      expect(contribution.source).toMatchObject({
        id: 'water-footprint',
        categories: ['water-footprint'],
      });
      expect(contribution.source).not.toHaveProperty('lastUpdated');
      const { publications } = contribution.source as StaticDataSource;

      expect(publications).toHaveLength(4);
      expect(
        publications.map(({ citation, url, entryCount, publishedYear }) => ({
          citation,
          url,
          entryCount,
          publishedYear,
        })),
      ).toEqual(
        expect.arrayContaining([
          {
            citation: 'Poore & Nemecek (2018), Science',
            url: 'https://doi.org/10.1126/science',
            entryCount: 1,
            publishedYear: 2018,
          },
          {
            citation: 'Mekonnen & Hoekstra (2011), Hydrology and Earth System Sciences',
            url: 'https://waterfootprint.org/en/resources/waterstat/',
            entryCount: 1,
            publishedYear: 2011,
          },
          {
            citation: 'de Vries (2023), Cell Reports Sustainability',
            url: 'https://doi.org/10.1016/j.crsus.2023.100004',
            entryCount: 1,
            publishedYear: 2023,
          },
          {
            citation: 'Poore & Nemecek (2018), Science',
            url: 'https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore',
            entryCount: 2,
            publishedYear: 2018,
          },
        ]),
      );
    });

    it('should follow the fixture and attach the publisher only where one is resolved', () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(mockProducts));

      const [contribution] = new WaterFootprintService().getDataSources();
      const { publications } = contribution.source as StaticDataSource;

      expect(publications).toHaveLength(3);
      expect(publications.filter(({ publisher }) => publisher)).toEqual([
        expect.objectContaining({ citation: 'Poore & Nemecek (2018), Science' }),
      ]);
    });

    it('should contribute nothing for an empty dataset', () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      mockReadFileSync.mockImplementation(() => {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      });

      expect(new WaterFootprintService().getDataSources()).toEqual([]);
    });
  });
});
