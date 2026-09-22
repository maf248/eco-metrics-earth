import { Test, TestingModule } from '@nestjs/testing';

import { WaterFootprintModule } from '../../src/modules/water-footprint/water-footprint.module';
import { WaterFootprintService } from '../../src/modules/water-footprint/water-footprint.service';

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

  it('should load the real 60-product dataset', () => {
    const service = module.get(WaterFootprintService);
    expect(service.getAllProducts()).toHaveLength(60);
  });
});
