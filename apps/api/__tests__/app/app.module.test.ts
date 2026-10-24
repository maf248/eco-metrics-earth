import { Test, TestingModule } from '@nestjs/testing';
import { getOptionsToken, ThrottlerModuleOptions } from '@nestjs/throttler';

import { AppModule } from '../../src/app/app.module';
import { DataSourcesService } from '../../src/modules/data-sources/data-sources.service';

describe('AppModule', () => {
  it('should compile successfully', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should configure a single throttler entry of 60 requests per 60 seconds', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const options = module.get<ThrottlerModuleOptions>(getOptionsToken());

    expect(options).toEqual(
      expect.objectContaining({
        throttlers: [{ ttl: 60_000, limit: 60 }],
        skipIf: expect.any(Function),
      }),
    );
  });

  it('should register the data sources module and discover the water-footprint dataset', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const catalog = await module.get(DataSourcesService).getCatalog();

    expect(catalog.datasets.map(({ id }) => id)).toEqual(['water-footprint']);
    expect(catalog.providers).toEqual([]);
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
