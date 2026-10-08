import { Controller, Get } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import supertest from 'supertest';

import { createInternalKeyBypass } from '../../src/common/throttler/internal-key-bypass';
import { HealthController } from '../../src/health/health.controller';

const LIMIT = 3;
const SECRET = 'k'.repeat(32);

@Controller('limited')
class LimitedController {
  @Get()
  get(): { ok: boolean } {
    return { ok: true };
  }
}

async function createApp(options: {
  trustProxy: number;
  secret: string | undefined;
}): Promise<NestExpressApplication> {
  const module = await Test.createTestingModule({
    imports: [
      ThrottlerModule.forRootAsync({
        useFactory: () => ({
          throttlers: [{ ttl: 60_000, limit: LIMIT }],
          skipIf: createInternalKeyBypass(options.secret),
        }),
      }),
    ],
    controllers: [LimitedController, HealthController],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  }).compile();

  const app = module.createNestApplication<NestExpressApplication>();
  app.set('trust proxy', options.trustProxy);
  await app.init();
  return app;
}

async function exhaust(
  agent: ReturnType<typeof supertest>,
  headers: Record<string, string>,
  count: number,
): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await agent.get('/limited').set(headers).expect(200);
  }
}

describe('Throttler client identification', () => {
  describe('with trust proxy = 1 and an internal key configured', () => {
    let app: NestExpressApplication;
    let agent: ReturnType<typeof supertest>;

    beforeAll(async () => {
      app = await createApp({ trustProxy: 1, secret: SECRET });
      agent = supertest(app.getHttpServer());
    });

    afterAll(async () => {
      await app.close();
    });

    it('should give different X-Forwarded-For clients different buckets', async () => {
      await exhaust(agent, { 'X-Forwarded-For': '203.0.113.10' }, LIMIT);
      await agent.get('/limited').set('X-Forwarded-For', '203.0.113.10').expect(429);
      await agent.get('/limited').set('X-Forwarded-For', '203.0.113.11').expect(200);
    });

    it('should keep the same bucket when a forged leftmost entry rotates', async () => {
      await exhaust(agent, { 'X-Forwarded-For': '203.0.113.20' }, LIMIT);

      for (const forged of ['198.51.100.1', '198.51.100.2', '198.51.100.3']) {
        await agent.get('/limited').set('X-Forwarded-For', `${forged}, 203.0.113.20`).expect(429);
      }
    });

    it('should let a valid internal key bypass the limit', async () => {
      await exhaust(agent, { 'X-Forwarded-For': '203.0.113.30', 'X-Internal-Api-Key': SECRET }, 10);
    });

    it('should throttle a wrong key, including one of a different length', async () => {
      const headers = { 'X-Forwarded-For': '203.0.113.40', 'X-Internal-Api-Key': 'wrong' };
      await exhaust(agent, headers, LIMIT);
      await agent.get('/limited').set(headers).expect(429);

      const sameLength = {
        'X-Forwarded-For': '203.0.113.41',
        'X-Internal-Api-Key': 'x'.repeat(32),
      };
      await exhaust(agent, sameLength, LIMIT);
      await agent.get('/limited').set(sameLength).expect(429);
    });

    it('should throttle requests without the key', async () => {
      const headers = { 'X-Forwarded-For': '203.0.113.50' };
      await exhaust(agent, headers, LIMIT);
      await agent.get('/limited').set(headers).expect(429);
    });

    it('should keep the health endpoint exempt under forged X-Forwarded-For', async () => {
      for (let i = 0; i < LIMIT * 4; i += 1) {
        await agent
          .get('/health')
          .set('X-Forwarded-For', `198.51.100.${i + 1}, 203.0.113.60`)
          .expect(200)
          .expect({ status: 'ok' });
      }
    });
  });

  describe('with trust proxy = 0', () => {
    let app: NestExpressApplication;

    beforeAll(async () => {
      app = await createApp({ trustProxy: 0, secret: SECRET });
    });

    afterAll(async () => {
      await app.close();
    });

    it('should ignore X-Forwarded-For and count all requests in one bucket', async () => {
      const agent = supertest(app.getHttpServer());
      await agent.get('/limited').set('X-Forwarded-For', '203.0.113.70').expect(200);
      await agent.get('/limited').set('X-Forwarded-For', '203.0.113.71').expect(200);
      await agent.get('/limited').set('X-Forwarded-For', '203.0.113.72').expect(200);
      await agent.get('/limited').set('X-Forwarded-For', '203.0.113.73').expect(429);
    });
  });

  describe('without a configured internal key', () => {
    let app: NestExpressApplication;

    beforeAll(async () => {
      app = await createApp({ trustProxy: 1, secret: undefined });
    });

    afterAll(async () => {
      await app.close();
    });

    it('should never bypass the limit, even with an empty or arbitrary key', async () => {
      const agent = supertest(app.getHttpServer());

      const emptyKey = { 'X-Forwarded-For': '203.0.113.80', 'X-Internal-Api-Key': '' };
      await exhaust(agent, emptyKey, LIMIT);
      await agent.get('/limited').set(emptyKey).expect(429);

      const anyKey = { 'X-Forwarded-For': '203.0.113.81', 'X-Internal-Api-Key': 'anything' };
      await exhaust(agent, anyKey, LIMIT);
      await agent.get('/limited').set(anyKey).expect(429);
    });
  });
});
