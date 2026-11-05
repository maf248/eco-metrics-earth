import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import supertest from 'supertest';

import { AppModule } from '../../src/app/app.module';
import { applyGlobalPipeline } from '../../src/app/global-pipeline';
import { ALLOW_KEYLESS_KEY } from '../../src/common/internal-key/allow-keyless.decorator';
import { ProviderSnapshotService } from '../../src/common/snapshots/provider-snapshot.service';
import { SNAPSHOT_STORE } from '../../src/common/snapshots/snapshot-store';
import { DependenciesHealthController } from '../../src/health/dependencies-health.controller';
import { HealthController } from '../../src/health/health.controller';
import { StubSnapshotStore } from '../common/snapshots/stub-snapshot-store';

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
      imports: [
        ThrottlerModule.forRoot([
          { name: 'default', ttl: 60_000, limit: 3 },
          { name: 'anonymous', ttl: 60_000, limit: 3 },
        ]),
      ],
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

describe('HealthController access metadata', () => {
  it('should mark only the liveness handler as allowed without a key', () => {
    expect(Reflect.getMetadata(ALLOW_KEYLESS_KEY, HealthController.prototype.check)).toBe(true);
    expect(
      Reflect.getMetadata(ALLOW_KEYLESS_KEY, DependenciesHealthController.prototype.check),
    ).toBeUndefined();
    expect(Reflect.getMetadata(ALLOW_KEYLESS_KEY, DependenciesHealthController)).toBeUndefined();
  });
});

describe('HealthController independence from snapshot persistence', () => {
  it('should not depend on the snapshot service or the snapshot store token', () => {
    const injected: unknown[] = [
      ...(Reflect.getMetadata('design:paramtypes', HealthController) ?? []),
      ...(Reflect.getMetadata('self:paramtypes', HealthController) ?? []).map(
        (entry: { param: unknown }) => entry.param,
      ),
    ];

    expect(injected).not.toContain(ProviderSnapshotService);
    expect(injected).not.toContain(SNAPSHOT_STORE);
  });

  it('should answer 200 with { status: "ok" } and touch no store method when the store rejects everything', async () => {
    const store = new StubSnapshotStore().failEverything();
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SNAPSHOT_STORE)
      .useValue(store)
      .compile();
    const app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    applyGlobalPipeline(app);
    await app.init();

    try {
      const response = await supertest(app.getHttpServer()).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
      expect(store.calls).toEqual([]);
    } finally {
      await app.close();
    }
  });
});
