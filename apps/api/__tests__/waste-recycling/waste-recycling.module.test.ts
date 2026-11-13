import { Test, TestingModule } from '@nestjs/testing';

import { WasteRecyclingController } from '../../src/modules/waste-recycling/waste-recycling.controller';
import { WasteRecyclingModule } from '../../src/modules/waste-recycling/waste-recycling.module';

describe('WasteRecyclingModule', () => {
  it('should compile and serve the real dataset without any external call', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [WasteRecyclingModule],
    }).compile();

    const response = module.get(WasteRecyclingController).findAll();

    expect(response.success).toBe(true);
    expect(response.success && response.data.countries).toHaveLength(217);
  });

  it('should attribute the real dataset to the World Bank under CC BY 4.0 with its update date', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [WasteRecyclingModule],
    }).compile();

    const response = module.get(WasteRecyclingController).findAll();

    expect(response.meta?.source).toEqual({
      provider: 'World Bank',
      license: 'CC BY 4.0',
      sourceUrl:
        'https://datacatalog.worldbank.org/search/dataset/0039597/What-a-Waste-Global-Database',
      lastUpdated: '2026-03-11',
    });
  });

  it('should not call any external service while serving the endpoint', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const module: TestingModule = await Test.createTestingModule({
      imports: [WasteRecyclingModule],
    }).compile();

    module.get(WasteRecyclingController).findAll();

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
