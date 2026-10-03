import { Test, TestingModule } from '@nestjs/testing';

import { HealthModule } from '../../src/health/health.module';

describe('HealthModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });
});
