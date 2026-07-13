import { Test, TestingModule } from '@nestjs/testing';

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('[]'),
}));

import { WaterFootprintModule } from '../../src/modules/water-footprint/water-footprint.module';

describe('WaterFootprintModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [WaterFootprintModule],
    }).compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });
});
