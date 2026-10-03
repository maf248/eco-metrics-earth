import { Test, TestingModule } from '@nestjs/testing';

import { FallbackModule } from '../../../src/common/fallback/fallback.module';

describe('FallbackModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [FallbackModule],
    }).compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });
});
