import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { WaterFootprintController } from '../../src/modules/water-footprint/water-footprint.controller';
import { WaterFootprintService } from '../../src/modules/water-footprint/water-footprint.service';

describe('WaterFootprintController', () => {
  let controller: WaterFootprintController;
  const service = {
    getAllProducts: jest.fn(),
    getByCategory: jest.fn(),
  };

  const mockProducts = [
    {
      product: 'Apples',
      category: 'Food & Beverages',
      waterFootprintLiters: 180.1,
      unit: 'per kg',
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
      source: 'Mekonnen & Hoekstra (2011), Hydrology and Earth System Sciences',
      sourceUrl: 'https://waterfootprint.org/en/resources/waterstat/',
      methodology: 'Blue and green water footprint of cotton lint.',
    },
    {
      product: 'Compact car',
      category: 'Manufactured',
      waterFootprintLiters: 400000,
      unit: 'per unit',
      source: 'Water Footprint Network (various)',
      sourceUrl: 'https://waterfootprint.org/en/resources/waterstat/',
      methodology: 'Weighted global average. Values may vary by production method and location.',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WaterFootprintController],
      providers: [
        {
          provide: WaterFootprintService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<WaterFootprintController>(WaterFootprintController);
    jest.clearAllMocks();
  });

  it('should return all products when no category is provided', () => {
    service.getAllProducts.mockReturnValue(mockProducts);

    expect(controller.getProducts()).toEqual({
      success: true,
      data: mockProducts,
      status: 200,
    });
    expect(service.getAllProducts).toHaveBeenCalledTimes(1);
  });

  it('should return filtered products for a valid category', () => {
    service.getByCategory.mockReturnValue([mockProducts[0]]);

    expect(controller.getProducts('food-beverages')).toEqual({
      success: true,
      data: [mockProducts[0]],
      status: 200,
    });
    expect(service.getByCategory).toHaveBeenCalledWith('food-beverages');
  });

  it('should throw BadRequestException for an invalid category slug', () => {
    service.getByCategory.mockImplementation(() => {
      throw new BadRequestException(
        'Invalid category filter. Valid values: food-beverages, textiles, technology, manufactured',
      );
    });

    expect(() => controller.getProducts('invalid')).toThrow(BadRequestException);
  });

  it('should return a 200 response with an empty array when the filter yields no results', () => {
    service.getByCategory.mockReturnValue([]);

    expect(controller.getProducts('manufactured')).toEqual({
      success: true,
      data: [],
      status: 200,
    });
  });

  it('should propagate unexpected errors thrown by the service', () => {
    const internalError = new Error('Unexpected service failure');
    service.getByCategory.mockImplementation(() => {
      throw internalError;
    });

    expect(() => controller.getProducts('food-beverages')).toThrow(internalError);
  });
});
