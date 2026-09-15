import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import supertest from 'supertest';

import { HealthController } from '../../src/health/health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return { status: "ok" }', () => {
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});

describe('HealthController rate-limit exemption', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 3 }])],
      controllers: [HealthController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should serve more requests than the throttle limit without returning 429', async () => {
    const agent = supertest(app.getHttpServer());

    for (let i = 0; i < 5; i += 1) {
      const response = await agent.get('/health').expect(200);
      expect(response.body).toEqual({ status: 'ok' });
    }
  });
});
