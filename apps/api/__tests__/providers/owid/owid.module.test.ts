import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Cache } from 'cache-manager';

import { AppConfigModule } from '../../../src/config/app-config.module';
import { AppConfigService } from '../../../src/config/app-config.service';
import { envValidationSchema } from '../../../src/config/env-validation.schema';
import { OwidClient } from '../../../src/modules/providers/owid/owid-client.service';
import { OwidModule } from '../../../src/modules/providers/owid/owid.module';

describe('OwidModule', () => {
  it('should compile and expose OwidClient', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validationSchema: envValidationSchema,
        }),
        AppConfigModule,
        OwidModule,
      ],
    }).compile();

    const client = moduleRef.get(OwidClient);
    expect(client).toBeInstanceOf(OwidClient);
  });

  it('should convert OWID_CACHE_TTL_SECONDS to milliseconds in the cache manager factory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validationSchema: envValidationSchema,
        }),
        AppConfigModule,
        OwidModule,
      ],
    })
      .overrideProvider(AppConfigService)
      .useValue({
        owidGrapherBaseUrl: 'https://ourworldindata.org/grapher',
        owidApiBaseUrl: 'https://api.ourworldindata.org/v1',
        owidHttpTimeoutMs: 10000,
        owidCacheTtlSeconds: 0.1,
      } as AppConfigService)
      .compile();

    const cache = moduleRef.get<Cache>(CACHE_MANAGER);
    await cache.set('ttl-test', 'value');
    expect(await cache.get('ttl-test')).toBe('value');

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(await cache.get('ttl-test')).toBeNull();
  });
});
