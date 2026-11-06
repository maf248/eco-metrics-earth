import { Controller, Get } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import supertest from 'supertest';

import { FallbackController } from '../../src/common/fallback/fallback.controller';
import { InternalKeyGuard } from '../../src/common/internal-key/internal-key.guard';
import { buildThrottlerOptions } from '../../src/common/internal-key/throttler-options';
import { AppConfigService } from '../../src/config/app-config.service';
import { HealthController } from '../../src/health/health.controller';

const KEYED_LIMIT = 5;
const ANONYMOUS_LIMIT = 3;
const SECRET = 'k'.repeat(32);

@Controller('limited')
class LimitedController {
  @Get()
  get(): { ok: boolean } {
    return { ok: true };
  }
}

// Stands in for DependenciesHealthController: same path, no @AllowKeyless().
@Controller('health/dependencies')
class DependenciesStubController {
  @Get()
  get(): { status: string } {
    return { status: 'ok' };
  }
}

async function createApp(options: {
  trustProxy: number;
  secret: string | undefined;
}): Promise<NestExpressApplication> {
  const appConfig = { internalApiKey: options.secret } as AppConfigService;
  const module = await Test.createTestingModule({
    imports: [
      ThrottlerModule.forRootAsync({
        useFactory: () =>
          buildThrottlerOptions(appConfig, { keyed: KEYED_LIMIT, anonymous: ANONYMOUS_LIMIT }),
      }),
    ],
    controllers: [
      LimitedController,
      HealthController,
      DependenciesStubController,
      FallbackController,
    ],
    providers: [
      { provide: AppConfigService, useValue: appConfig },
      { provide: APP_GUARD, useClass: ThrottlerGuard },
      { provide: APP_GUARD, useClass: InternalKeyGuard },
    ],
  }).compile();

  const app = module.createNestApplication<NestExpressApplication>();
  app.set('trust proxy', options.trustProxy);
  await app.init();
  return app;
}

async function send(
  agent: ReturnType<typeof supertest>,
  path: string,
  headers: Record<string, string>,
  count: number,
  status: number,
): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await agent.get(path).set(headers).expect(status);
  }
}

describe('Two-tier throttling and internal key enforcement', () => {
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

    it('should answer 401 up to the anonymous limit and 429 after it', async () => {
      const headers = { 'X-Forwarded-For': '203.0.113.10' };
      await send(agent, '/limited', headers, ANONYMOUS_LIMIT, 401);
      await agent.get('/limited').set(headers).expect(429);
    });

    it('should not reveal missing versus wrong key nor echo the key in the 401 body', async () => {
      const missing = await agent.get('/limited').set('X-Forwarded-For', '203.0.113.11');
      const wrong = await agent
        .get('/limited')
        .set({ 'X-Forwarded-For': '203.0.113.12', 'X-Internal-Api-Key': 'wrong-key-value' });

      expect(missing.status).toBe(401);
      expect(wrong.status).toBe(401);
      expect(wrong.body).toEqual(missing.body);
      expect(JSON.stringify(wrong.body)).not.toContain('wrong-key-value');
      expect(JSON.stringify(wrong.body)).not.toContain(SECRET);
    });

    it('should answer 401 for a key of a different length and for a repeated header', async () => {
      await agent
        .get('/limited')
        .set({ 'X-Forwarded-For': '203.0.113.13', 'X-Internal-Api-Key': 'short' })
        .expect(401);
      await agent
        .get('/limited')
        .set({ 'X-Forwarded-For': '203.0.113.13', 'X-Internal-Api-Key': 'x'.repeat(64) })
        .expect(401);
      // Node joins a repeated header into one comma-separated string.
      await agent
        .get('/limited')
        .set({ 'X-Forwarded-For': '203.0.113.13', 'X-Internal-Api-Key': `${SECRET}, ${SECRET}` })
        .expect(401);
    });

    it('should serve a valid key up to the keyed limit and answer 429 after it', async () => {
      const headers = { 'X-Forwarded-For': '203.0.113.20', 'X-Internal-Api-Key': SECRET };
      await send(agent, '/limited', headers, KEYED_LIMIT, 200);
      await agent.get('/limited').set(headers).expect(429);
    });

    it('should keep the tiers independent for the same client', async () => {
      const ip = { 'X-Forwarded-For': '203.0.113.30' };
      await send(agent, '/limited', ip, ANONYMOUS_LIMIT, 401);
      await agent.get('/limited').set(ip).expect(429);

      await agent
        .get('/limited')
        .set({ ...ip, 'X-Internal-Api-Key': SECRET })
        .expect(200);
    });

    it('should give different X-Forwarded-For clients different anonymous buckets', async () => {
      await send(agent, '/limited', { 'X-Forwarded-For': '203.0.113.40' }, ANONYMOUS_LIMIT, 401);
      await agent.get('/limited').set('X-Forwarded-For', '203.0.113.40').expect(429);
      await agent.get('/limited').set('X-Forwarded-For', '203.0.113.41').expect(401);
    });

    it('should keep answering 429 when a forged leftmost entry rotates', async () => {
      await send(agent, '/limited', { 'X-Forwarded-For': '203.0.113.50' }, ANONYMOUS_LIMIT, 401);

      for (const forged of ['198.51.100.1', '198.51.100.2', '198.51.100.3']) {
        await agent.get('/limited').set('X-Forwarded-For', `${forged}, 203.0.113.50`).expect(429);
      }
    });

    it('should keep the health endpoint open and unthrottled without a key', async () => {
      for (let i = 0; i < ANONYMOUS_LIMIT * 4; i += 1) {
        await agent
          .get('/health')
          .set('X-Forwarded-For', `198.51.100.${i + 1}, 203.0.113.60`)
          .expect(200)
          .expect({ status: 'ok' });
      }
    });

    it('should require the key on /health/dependencies', async () => {
      await agent.get('/health/dependencies').set('X-Forwarded-For', '203.0.113.61').expect(401);
      await agent
        .get('/health/dependencies')
        .set({ 'X-Forwarded-For': '203.0.113.61', 'X-Internal-Api-Key': SECRET })
        .expect(200);
    });

    it('should answer 401 for an unknown path without a key and 404 with it', async () => {
      await agent.get('/does-not-exist').set('X-Forwarded-For', '203.0.113.62').expect(401);
      await agent
        .get('/does-not-exist')
        .set({ 'X-Forwarded-For': '203.0.113.62', 'X-Internal-Api-Key': SECRET })
        .expect(404);
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

    it('should ignore X-Forwarded-For and count all anonymous requests in one bucket', async () => {
      const agent = supertest(app.getHttpServer());
      await agent.get('/limited').set('X-Forwarded-For', '203.0.113.70').expect(401);
      await agent.get('/limited').set('X-Forwarded-For', '203.0.113.71').expect(401);
      await agent.get('/limited').set('X-Forwarded-For', '203.0.113.72').expect(401);
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

    it('should serve requests without a key on the keyed tier', async () => {
      const agent = supertest(app.getHttpServer());
      const headers = { 'X-Forwarded-For': '203.0.113.80' };
      await send(agent, '/limited', headers, KEYED_LIMIT, 200);
      await agent.get('/limited').set(headers).expect(429);
    });

    it('should serve /health/dependencies and unknown paths per their own handlers', async () => {
      const agent = supertest(app.getHttpServer());
      await agent.get('/health/dependencies').set('X-Forwarded-For', '203.0.113.81').expect(200);
      await agent.get('/does-not-exist').set('X-Forwarded-For', '203.0.113.81').expect(404);
    });
  });
});
