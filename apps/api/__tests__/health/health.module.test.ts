import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { envValidationSchema } from '../../src/config/env-validation.schema';
import { HealthModule } from '../../src/health/health.module';

describe('HealthModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
        HealthModule,
      ],
    }).compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });
});
