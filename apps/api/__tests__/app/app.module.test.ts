import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getOptionsToken, ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';

import { AppModule } from '../../src/app/app.module';
import { InternalKeyGuard } from '../../src/common/internal-key/internal-key.guard';
import { DataSourcesService } from '../../src/modules/data-sources/data-sources.service';

describe('AppModule', () => {
  it('should register ThrottlerGuard before InternalKeyGuard as global guards', () => {
    const providers: Array<{ provide?: unknown; useClass?: unknown }> =
      Reflect.getMetadata('providers', AppModule) ?? [];
    const globalGuards = providers
      .filter((provider) => provider.provide === APP_GUARD)
      .map((provider) => provider.useClass);

    expect(globalGuards).toEqual([ThrottlerGuard, InternalKeyGuard]);
  });

  it('should compile successfully', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should configure two throttler entries: default 300 and anonymous 30 per 60 seconds', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const options = module.get<ThrottlerModuleOptions>(getOptionsToken());

    expect(options).toEqual(
      expect.objectContaining({
        throttlers: [
          { name: 'default', ttl: 60_000, limit: 300, skipIf: expect.any(Function) },
          { name: 'anonymous', ttl: 60_000, limit: 30, skipIf: expect.any(Function) },
        ],
      }),
    );
  });

  it('should register the data sources module, the water-footprint dataset and the OWID provider', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const catalog = await module.get(DataSourcesService).getCatalog();

    expect(catalog.datasets.map(({ id }) => id)).toEqual(['water-footprint']);
    expect(catalog.providers.map(({ id, categories }) => ({ id, categories }))).toEqual([
      { id: 'owid', categories: ['co2-emissions', 'energy-sources', 'global-temperature'] },
    ]);
  });

  // The OWID cache (default in-memory Keyv Map store) holds no timers, sockets or file
  // handles, so no onApplicationShutdown/onModuleDestroy hook is needed: closing the
  // app must complete cleanly. Run with --detectOpenHandles to verify nothing lingers.
  it('should initialise and close cleanly without any shutdown hook for the OWID cache', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = module.createNestApplication({ logger: false });

    await app.init();

    await expect(app.close()).resolves.toBeUndefined();
  });
});
