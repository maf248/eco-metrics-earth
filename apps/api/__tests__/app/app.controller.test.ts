import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from '../../src/app/app.controller';
import { AppService } from '../../src/app/app.service';

describe('AppController', () => {
  let controller: AppController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should return a message object', () => {
    expect(controller.getData()).toEqual({ message: 'Hello API' });
  });
});
