import { Test, TestingModule } from '@nestjs/testing';

import { WasteRecyclingController } from '../../src/modules/waste-recycling/waste-recycling.controller';
import { WasteRecyclingService } from '../../src/modules/waste-recycling/waste-recycling.service';

describe('WasteRecyclingController', () => {
  const data = {
    world: {
      generation: {
        kgPerPersonPerDay2022: 0.8,
        tonnes2022: 1,
        tonnes2030: 2,
        tonnes2040: 3,
        tonnes2050: 4,
      },
      recycling: { sharePercent: 17.6, countries: 130, populationSharePercent: 46 },
    },
    countries: [],
  };
  const service = {
    getData: jest.fn().mockReturnValue(data),
    getDates: jest.fn().mockReturnValue({ lastUpdated: '2026-03-11', retrieved: '2026-11-11' }),
  };
  let controller: WasteRecyclingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WasteRecyclingController],
      providers: [{ provide: WasteRecyclingService, useValue: service }],
    }).compile();

    controller = module.get(WasteRecyclingController);
  });

  it('should answer 200 with the data and the World Bank attribution', () => {
    expect(controller.findAll()).toEqual({
      success: true,
      data,
      status: 200,
      meta: {
        source: {
          provider: 'World Bank',
          license: 'CC BY 4.0',
          sourceUrl:
            'https://datacatalog.worldbank.org/search/dataset/0039597/What-a-Waste-Global-Database',
          lastUpdated: '2026-03-11',
        },
        fetchedAt: '2026-11-11T00:00:00.000Z',
      },
    });
  });

  it('should not mark the response as stale', () => {
    expect(controller.findAll().meta).not.toHaveProperty('stale');
  });
});
