import { readFileSync } from 'fs';

import { BadRequestException, Logger } from '@nestjs/common';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

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

    expect(all).toEqual(mockProducts);
    expect(all).not.toBe(mockProducts);
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
});
