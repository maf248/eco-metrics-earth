import { Test, TestingModule } from '@nestjs/testing';

import { AppService } from '../../src/app/app.service';

describe('AppService', () => {
  let service: AppService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should return a message object', () => {
    expect(service.getData()).toEqual({ message: 'Hello API' });
  });
});
