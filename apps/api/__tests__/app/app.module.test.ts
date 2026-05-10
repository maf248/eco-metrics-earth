import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../../src/app/app.module';

describe('AppModule', () => {
  it('should compile successfully', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
