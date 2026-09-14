import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import supertest from 'supertest';

@Controller('rate-limit-test')
class RateLimitTestController {
  @Get()
  get(): { ok: boolean } {
    return { ok: true };
  }
}

describe('ThrottlerGuard rate limiting', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 3 }])],
      controllers: [RateLimitTestController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow requests within the budget and reject excess with 429', async () => {
    const agent = supertest(app.getHttpServer());

    const first = await agent.get('/rate-limit-test').expect(200);
    expect(first.body).toEqual({ ok: true });
    expect(first.headers['x-ratelimit-limit']).toBe('3');

    await agent.get('/rate-limit-test').expect(200);
    await agent.get('/rate-limit-test').expect(200);

    const blocked = await agent.get('/rate-limit-test').expect(429);
    expect(blocked.body).toEqual({
      statusCode: 429,
      message: 'ThrottlerException: Too Many Requests',
    });
    expect(blocked.headers['retry-after']).toMatch(/^\d+$/);
  });
});
